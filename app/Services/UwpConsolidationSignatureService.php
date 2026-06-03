<?php

namespace App\Services;

use App\Models\UwpConsolidationSignature;
use App\Models\User;
use App\Exports\StageOne\UwpExcelExport;
use App\Models\UnitWorkPlan;
use App\Models\Opcr;
use App\Exports\StageOne\OpcrExcelExport;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

class UwpConsolidationSignatureService
{
    public function __construct(
        private readonly UwpExcelPayloadService $payloadService,
    ) {
    }

    public function createSignedOpcrArtifact(Opcr $opcr, string $signatureDataUrl, bool $isPmt = false): array
    {
        $disk = Storage::disk('public');
        $signaturePath = 'signatures/opcr/' . $opcr->id . '_' . time() . '.png';

        // Save current signature image
        $signatureData = str_replace('data:image/png;base64,', '', $signatureDataUrl);
        $signatureData = str_replace(' ', '+', $signatureData);
        $currentSignatureBinary = base64_decode($signatureData);
        $disk->put($signaturePath, $currentSignatureBinary);

        // Find existing signatures for this OPCR to ensure we don't lose them
        $existingSignatures = UwpConsolidationSignature::query()
            ->where('opcr_id', $opcr->id)
            ->with('signer')
            ->get();

        $latestSignature = $existingSignatures->sortByDesc('signed_at')->first();

        try {
            // Prepare the XLSX to sign
            // Priority: 1. Latest signed version, 2. Base consolidated file, 3. Generate new
            $sourcePath = null;
            if ($latestSignature && $latestSignature->signed_excel_path && $disk->exists($latestSignature->signed_excel_path)) {
                $sourcePath = $disk->path($latestSignature->signed_excel_path);
            } elseif ($disk->exists('opcr_consolidated_' . $opcr->id . '.xlsx')) {
                $sourcePath = $disk->path('opcr_consolidated_' . $opcr->id . '.xlsx');
            }

            if ($sourcePath) {
                $spreadsheet = IOFactory::load($sourcePath);
            } else {
                // Generate base file on the fly if missing
                $export = new OpcrExcelExport($opcr);
                $tempFilename = 'temp_opcr_' . $opcr->id . '_' . time() . '.xlsx';
                Excel::store($export, $tempFilename, 'public');
                $tempPath = $disk->path($tempFilename);
                $spreadsheet = IOFactory::load($tempPath);
                @unlink($tempPath);
            }

            $worksheet = $spreadsheet->getActiveSheet();
            $targetSignatureRow = 0;
            $highestRow = $worksheet->getHighestRow();

            // Dynamic footer row detection - look for label rows
            for ($r = $highestRow; $r >= max(1, $highestRow - 100); $r--) {
                $val = (string) $worksheet->getCell("A{$r}")->getValue();
                if (str_contains($val, 'Discussed with') || str_contains($val, 'Assessed by')) {
                    $targetSignatureRow = $r + 1;
                    break;
                }
            }

            if ($targetSignatureRow === 0) {
                throw new \Exception("Could not find signature row in OPCR template.");
            }

            $signatureAbsolutePath = $disk->path($signaturePath);

            // 1. Inject current signature
            $currentRole = $isPmt ? 'pmt-chairperson' : 'opcr-dept-head';
            $this->injectSignatureToWorksheet($worksheet, $signatureAbsolutePath, $currentRole, $targetSignatureRow);

            // 2. Re-inject historical signatures for OTHER roles
            $latestByRole = $existingSignatures
                ->sortByDesc('signed_at')
                ->unique(function ($s) {
                    $action = $s->metadata['action'] ?? '';
                    if ($action === 'dept_head_endorse_opcr') return 'opcr-dept-head';
                    if ($action === 'pmt_approve_opcr') return 'pmt-chairperson';
                    return 'unknown';
                });

            foreach ($latestByRole as $existing) {
                $action = $existing->metadata['action'] ?? '';
                $existingRole = ($action === 'dept_head_endorse_opcr') ? 'opcr-dept-head' : 
                               (($action === 'pmt_approve_opcr') ? 'pmt-chairperson' : null);

                if ($existingRole && $existingRole !== $currentRole) {
                    $oldPath = $disk->path($existing->signature_image_path);
                    if (File::exists($oldPath)) {
                        $this->injectSignatureToWorksheet($worksheet, $oldPath, $existingRole, $targetSignatureRow);
                    }
                }
            }

            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $signedExcelPath = 'signatures/opcr/signed_' . $opcr->id . '_' . time() . '.xlsx';
            $writer->save($disk->path($signedExcelPath));

            return [
                'signature_image_path' => $signaturePath,
                'signed_excel_path' => $signedExcelPath,
                'signature_hash' => hash_file('sha256', $signatureAbsolutePath),
            ];
        } catch (\Exception $e) {
            \Log::error("OPCR Signature Error: " . $e->getMessage());
            throw $e;
        }
    }

    public function createSignedArtifact(UnitWorkPlan $uwp, string $signatureDataUrl): array
    {
        $currentSignatureBinary = $this->decodeSignatureDataUrl($signatureDataUrl);
        $payload = $this->payloadService->build($uwp);
        
        $xlsxBinary = Excel::raw(
            new UwpExcelExport($payload['uwp'], $payload['standards']),
            \Maatwebsite\Excel\Excel::XLSX
        );

        $disk = Storage::disk('public');
        $timestamp = now()->format('Ymd_His');
        $suffix = Str::lower(Str::random(8));

        $signaturePath = "signatures/uwp/uwp_{$uwp->id}_{$timestamp}_{$suffix}.png";
        $signedExcelPath = "uwp/signed/uwp_{$uwp->id}_{$timestamp}_{$suffix}.xlsx";

        $signatureAbsolutePath = $disk->path($signaturePath);
        $signedExcelAbsolutePath = $disk->path($signedExcelPath);

        File::ensureDirectoryExists(dirname($signatureAbsolutePath));
        File::ensureDirectoryExists(dirname($signedExcelAbsolutePath));

        $disk->put($signaturePath, $currentSignatureBinary);

        // Determine current signer role
        $currentUser = auth()->user();
        $isDeptHead = $currentUser && $currentUser->role === 'dept-head';

        // Find existing signatures for this UWP to include in the Excel
        $existingSignatures = UwpConsolidationSignature::query()
            ->where('unit_work_plan_id', $uwp->id)
            ->with('signer')
            ->get();

        $tempWorkbookPath = tempnam(sys_get_temp_dir(), 'uwp-sign-');
        if ($tempWorkbookPath === false) {
            throw new \RuntimeException('Unable to allocate temporary workbook path.');
        }

        try {
            file_put_contents($tempWorkbookPath, $xlsxBinary);

            $spreadsheet = IOFactory::load($tempWorkbookPath);
            $worksheet = $spreadsheet->getActiveSheet();
            $signatureBaseRow = null;
            $searchLimit = min(2000, (int)$worksheet->getHighestRow());
            for ($r = $searchLimit; $r >= 1; $r--) {
                $cellVal = trim((string)$worksheet->getCell("A{$r}")->getValue());
                if ($cellVal === 'Prepared by:') {
                    $signatureBaseRow = $r;
                    break;
                }
            }

            // Fallback if not found
            $targetSignatureRow = $signatureBaseRow ? ($signatureBaseRow + 1) : max(1, (int)$worksheet->getHighestRow() - 2);

            // 1. Inject current signature
            $this->injectSignatureToWorksheet(
                $worksheet, 
                $signatureAbsolutePath, 
                $isDeptHead ? 'dept-head' : 'supervisor',
                $targetSignatureRow
            );

            // 2. Inject existing signatures (if any and not the current one)
            // Group by role and take only the latest one per role
            $latestSignaturesByRole = $existingSignatures
                ->sortByDesc('signed_at')
                ->unique(fn($s) => $s->signer?->role);

            foreach ($latestSignaturesByRole as $existing) {
                $existingRole = $existing->signer?->role;
                $currentRole = $isDeptHead ? 'dept-head' : 'supervisor';

                if ($existingRole && $existingRole !== $currentRole) {
                    $absPath = $disk->path($existing->signature_image_path);
                    if (File::exists($absPath)) {
                        $this->injectSignatureToWorksheet($worksheet, $absPath, $existingRole, $targetSignatureRow);
                    }
                }
            }

            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save($signedExcelAbsolutePath);
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet, $writer);
        } finally {
            @unlink($tempWorkbookPath);
        }

        return [
            'signature_image_path' => $signaturePath,
            'signed_excel_path' => $signedExcelPath,
            'signature_hash' => hash('sha256', $currentSignatureBinary),
        ];
    }

    private function injectSignatureToWorksheet($worksheet, string $absPath, string $role, int $row): void
    {
        $drawing = new Drawing();
        $name = str_contains($role, 'dept-head') || str_contains($role, 'pmt') ? 'Head Signature' : 'Supervisor Signature';
        $drawing->setName($name);
        $drawing->setPath($absPath);
        $isOpcr = str_contains(strtolower($worksheet->getTitle()), 'opcr');

        // Define target widths in pixels based on actual Excel column widths (chars * ~7.6)
        // Multiplier 7.6 is used for standard Excel character-to-pixel conversion
        $targetWidth = 540; // Default for UWP Supervisor (A+B: 72 chars)
        $anchor = "A{$row}";

        if ($role === 'dept-head') {
            // UWP Dept Head (C+D: 48 chars)
            $targetWidth = 365;
            $anchor = "C{$row}";
        } elseif ($role === 'opcr-dept-head') {
            // OPCR Dept Head (A+B+C+D: 105 chars)
            $targetWidth = 840;
            $anchor = "A{$row}";
        } elseif ($role === 'pmt-chairperson') {
            if ($isOpcr) {
                // OPCR PMT (G+H+I: 18 chars)
                $targetWidth = 150;
                $anchor = "G{$row}";
            } else {
                // UWP PMT (F+G: 60 chars)
                $targetWidth = 455;
                $anchor = "F{$row}";
            }
        }

        // Calculate centering using actual image dimensions
        $size = getimagesize($absPath);
        $origW = (float) ($size[0] ?? 1);
        $origH = (float) ($size[1] ?? 1);
        
        // Slightly larger max height for OPCR to fill the box better
        $maxH = $isOpcr ? 50.0 : 45.0;

        // Scale proportionally to fit max height
        $scaledW = ($origW / $origH) * $maxH;

        // Ensure it doesn't overflow the target width
        if ($scaledW > ($targetWidth - 10)) {
            $scaledW = (float) ($targetWidth - 10);
            $scaledH = ($origH / $origW) * $scaledW;
        } else {
            $scaledH = $maxH;
        }

        $drawing->setCoordinates($anchor);
        $drawing->setResizeProportional(true);
        $drawing->setHeight((int) $scaledH);
        $drawing->setWidth((int) $scaledW);

        // Center horizontally within the block
        $offsetX = (int) max(0, ($targetWidth - $scaledW) / 2);
        $drawing->setOffsetX($offsetX);
        
        // Adjust vertical offset: OPCR needs a bit more room than UWP
        $drawing->setOffsetY($isOpcr ? -6 : -12);
        
        $drawing->setWorksheet($worksheet);
    }

    public function cleanupArtifact(array $artifact): void
    {
        $disk = Storage::disk('public');

        foreach (['signature_image_path', 'signed_excel_path'] as $key) {
            $path = trim((string) ($artifact[$key] ?? ''));
            if ($path !== '' && $disk->exists($path)) {
                $disk->delete($path);
            }
        }
    }

    public function decodeSignatureDataUrl(string $signatureDataUrl): string
    {
        $signatureDataUrl = trim($signatureDataUrl);

        if (!str_starts_with($signatureDataUrl, 'data:image/png;base64,')) {
            throw new \InvalidArgumentException('Signature must be a base64-encoded PNG data URL.');
        }

        $encoded = substr($signatureDataUrl, strlen('data:image/png;base64,'));
        if ($encoded === '') {
            throw new \InvalidArgumentException('Signature payload is empty.');
        }

        $decoded = base64_decode($encoded, true);
        if ($decoded === false || $decoded === '') {
            throw new \InvalidArgumentException('Signature payload is invalid.');
        }

        return $decoded;
    }
}
