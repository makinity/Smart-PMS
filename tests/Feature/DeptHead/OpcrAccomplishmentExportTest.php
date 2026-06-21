<?php

namespace Tests\Feature\DeptHead;

use App\Models\Office;
use App\Models\AccomplishmentSubmission;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\OrsEntry;
use App\Models\OrsEntryMonitoring;
use App\Models\PerformancePeriod;
use App\Models\UnitWorkPlan;
use App\Models\User;
use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\UwpFunction;
use App\Models\UwpIndicatorAssignment;
use App\Models\UwpMfo;
use App\Models\UwpSuccessIndicator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OpcrAccomplishmentExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_returns_official_opcr_workbook_with_consolidated_ratings(): void
    {
        $fixture = $this->makeOfficeFixture();

        $response = $this->actingAs($fixture['dept_head'])
            ->get('/dept-head/opcr-accomplishment/export');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $tmpFile = tempnam(sys_get_temp_dir(), 'opcr_xlsx_');
        file_put_contents($tmpFile, $response->streamedContent());

        $spreadsheet = IOFactory::load($tmpFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('OPCR', $sheet->getTitle());

        $foundRow = null;
        foreach (range(1, $sheet->getHighestDataRow()) as $row) {
            if ($sheet->getCell("A{$row}")->getValue() === 'Service Delivery') {
                $foundRow = $row;
                break;
            }
        }

        $this->assertNotNull($foundRow, 'Did not find the official OPCR output row.');
        $this->assertSame(3.25, round((float) $sheet->getCell("F{$foundRow}")->getValue(), 2));
        $this->assertSame(5.0, round((float) $sheet->getCell("G{$foundRow}")->getValue(), 2));
        $this->assertSame(4.25, round((float) $sheet->getCell("H{$foundRow}")->getValue(), 2));
        $this->assertSame(4.17, round((float) $sheet->getCell("I{$foundRow}")->getValue(), 2));

        $zeroRow = null;
        foreach (range(1, $sheet->getHighestDataRow()) as $row) {
            if ($sheet->getCell("B{$row}")->getValue() === 'Unassigned OPCR output') {
                $zeroRow = $row;
                break;
            }
        }

        $this->assertNotNull($zeroRow, 'Did not find the unassigned OPCR output row.');
        $this->assertSame(0.0, round((float) $sheet->getCell("F{$zeroRow}")->getValue(), 2));
        $this->assertSame(0.0, round((float) $sheet->getCell("G{$zeroRow}")->getValue(), 2));
        $this->assertSame(0.0, round((float) $sheet->getCell("H{$zeroRow}")->getValue(), 2));
        $this->assertSame(0.0, round((float) $sheet->getCell("I{$zeroRow}")->getValue(), 2));

        $footerRow = null;
        $footerValues = [];
        foreach (range(1, $sheet->getHighestDataRow()) as $row) {
            $label = (string) $sheet->getCell("A{$row}")->getValue();
            if (in_array($label, [
                'Weighted Average Rating for Core Functions (100%)',
                'Weighted Average Rating for Support Functions (0%)',
                'OVERALL RATING',
                'ADJECTIVAL RATING',
            ], true)) {
                $footerValues[$label] = $sheet->getCell("F{$row}")->getValue();
            }

            if ($label === 'OVERALL RATING') {
                $footerRow = $row;
            }
        }

        $this->assertNotNull($footerRow, 'Did not find the official OPCR footer row.');
        $this->assertNotSame('', $footerValues['Weighted Average Rating for Core Functions (100%)'] ?? '');
        $this->assertNotSame('', $footerValues['Weighted Average Rating for Support Functions (0%)'] ?? '');
        $this->assertNotSame('', $footerValues['OVERALL RATING'] ?? '');
        $this->assertSame('Satisfactory', $footerValues['ADJECTIVAL RATING'] ?? null);
        $this->assertEqualsWithDelta(
            round((float) $footerValues['Weighted Average Rating for Core Functions (100%)'] + (float) $footerValues['Weighted Average Rating for Support Functions (0%)'], 2),
            round((float) $footerValues['OVERALL RATING'], 2),
            0.01
        );
        $this->assertSame(3.17, round((float) $sheet->getCell("F{$footerRow}")->getValue(), 2));

        unlink($tmpFile);
    }

    public function test_reset_returns_the_submission_to_pmt_review(): void
    {
        $fixture = $this->makeOfficeFixture();

        $this->actingAs($fixture['dept_head'])
            ->post('/dept-head/opcr-accomplishment/reset')
            ->assertSessionHas('success');

        $submission = OpcraAccomplishmentSubmission::where('office_id', $fixture['office']->id)
            ->where('performance_period_id', $fixture['period']->id)
            ->firstOrFail();

        $this->assertSame('submitted', $submission->status);
        $this->assertNull($submission->final_office_rating);
        $this->assertNull($submission->final_adjectival_rating);
        $this->assertNull($submission->pmt_action_at);
        $this->assertNull($submission->pmt_member_id);
    }

    public function test_export_requires_an_approved_opcr_for_the_active_period(): void
    {
        $office = Office::create([
            'name' => 'No OPCR Office',
            'code' => 'NOOPCR',
            'is_active' => true,
        ]);

        $deptHead = $this->makeRoleUser('dept-head', $office, 'Dept Head User');

        PerformancePeriod::create([
            'name' => 'FY 2026 H1',
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $this->actingAs($deptHead)
            ->get('/dept-head/opcr-accomplishment/export')
            ->assertStatus(422)
            ->assertSee('No approved OPCR found for the active performance period.');
    }

    public function test_dept_head_page_does_not_show_the_computed_rating_card(): void
    {
        $fixture = $this->makeOfficeFixture();

        $this->actingAs($fixture['dept_head'])
            ->get('/dept-head/opcr-accomplishment')
            ->assertOk()
            ->assertDontSee('Computed Rating');
    }

    private function makeOfficeFixture(): array
    {
        $office = Office::create([
            'name' => 'Planning Office',
            'code' => 'PLAN',
            'is_active' => true,
        ]);

        $deptHead = $this->makeRoleUser('dept-head', $office, 'Dept Head User');
        $employeeOne = $this->makeRoleUser('employee', $office, 'Employee One');
        $employeeTwo = $this->makeRoleUser('employee', $office, 'Employee Two');

        $period = PerformancePeriod::create([
            'name' => 'FY 2026 H1',
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $uwp = UnitWorkPlan::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'created_by' => $deptHead->id,
            'ratee_name' => 'Planning Office',
            'period_covered' => 'FY 2026 H1',
            'pgdh_name' => $deptHead->name,
            'status' => UnitWorkPlan::STATUS_PMT_APPROVED,
            'approved_at' => now(),
        ]);

        $opcr = Opcr::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'status' => 'approved',
        ]);

        $opcr->uwps()->attach($uwp->id);

        $function = UwpFunction::create([
            'unit_work_plan_id' => $uwp->id,
            'name' => 'Core Function',
            'function_type' => 'core',
            'weight_percent' => 100,
            'sort_order' => 1,
        ]);

        $mfo = UwpMfo::create([
            'uwp_function_id' => $function->id,
            'title' => 'Service Delivery',
            'weight_percent' => 100,
            'sort_order' => 1,
        ]);

        $indicator = UwpSuccessIndicator::create([
            'uwp_mfo_id' => $mfo->id,
            'indicator_text' => 'Deliver core service output',
            'target_quantity' => 10,
            'target_timeline' => 'FY 2026 H1',
            'allotted_budget' => 0,
            'sort_order' => 1,
        ]);

        $unassignedIndicator = UwpSuccessIndicator::create([
            'uwp_mfo_id' => $mfo->id,
            'indicator_text' => 'Unassigned OPCR output',
            'target_quantity' => 10,
            'target_timeline' => 'FY 2026 H1',
            'allotted_budget' => 0,
            'sort_order' => 2,
        ]);

        UwpIndicatorAssignment::create([
            'uwp_success_indicator_id' => $indicator->id,
            'employee_id' => $employeeOne->id,
            'assigned_by' => $deptHead->id,
            'assigned_at' => now(),
        ]);

        UwpIndicatorAssignment::create([
            'uwp_success_indicator_id' => $indicator->id,
            'employee_id' => $employeeTwo->id,
            'assigned_by' => $deptHead->id,
            'assigned_at' => now(),
        ]);

        $ipcrOne = Ipcr::create([
            'employee_id' => $employeeOne->id,
            'opcr_id' => $opcr->id,
            'performance_period_id' => $period->id,
            'status' => 'committed',
            'committed_at' => now(),
        ]);

        $ipcrTwo = Ipcr::create([
            'employee_id' => $employeeTwo->id,
            'opcr_id' => $opcr->id,
            'performance_period_id' => $period->id,
            'status' => 'committed',
            'committed_at' => now(),
        ]);

        $ipcrItemOne = IpcrItem::create([
            'ipcr_id' => $ipcrOne->id,
            'uwp_success_indicator_id' => $indicator->id,
        ]);

        $ipcrItemTwo = IpcrItem::create([
            'ipcr_id' => $ipcrTwo->id,
            'uwp_success_indicator_id' => $indicator->id,
        ]);

        $entryOne = OrsEntry::create([
            'employee_id' => $employeeOne->id,
            'supervisor_id' => $deptHead->id,
            'performance_period_id' => $period->id,
            'ipcr_id' => $ipcrOne->id,
            'ipcr_item_id' => $ipcrItemOne->id,
            'work_date' => '2026-02-15',
            'quantity' => 5,
            'status' => 'rated',
            'submitted_at' => now(),
        ]);

        OrsEntryMonitoring::create([
            'ors_entry_id' => $entryOne->id,
            'supervisor_id' => $deptHead->id,
            'quality_rating' => 4,
            'timeliness_rating' => 5,
            'rated_at' => now(),
        ]);

        $entryTwo = OrsEntry::create([
            'employee_id' => $employeeTwo->id,
            'supervisor_id' => $deptHead->id,
            'performance_period_id' => $period->id,
            'ipcr_id' => $ipcrTwo->id,
            'ipcr_item_id' => $ipcrItemTwo->id,
            'work_date' => '2026-03-15',
            'quantity' => 15,
            'status' => 'rated',
            'submitted_at' => now(),
        ]);

        OrsEntryMonitoring::create([
            'ors_entry_id' => $entryTwo->id,
            'supervisor_id' => $deptHead->id,
            'quality_rating' => 3,
            'timeliness_rating' => 4,
            'rated_at' => now(),
        ]);

        IpcrItem::create([
            'ipcr_id' => $ipcrOne->id,
            'uwp_success_indicator_id' => $unassignedIndicator->id,
        ]);

        AccomplishmentSubmission::create([
            'employee_id' => $employeeOne->id,
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'ipcr_id' => $ipcrOne->id,
            'dataset_source' => 'ipcr',
            'status' => 'released_by_pmt',
            'final_rating' => 3.17,
            'final_adjectival_rating' => 'Satisfactory',
            'submitted_at' => now(),
            'pmt_action_at' => now(),
        ]);

        AccomplishmentSubmission::create([
            'employee_id' => $employeeTwo->id,
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'ipcr_id' => $ipcrTwo->id,
            'dataset_source' => 'ipcr',
            'status' => 'released_by_pmt',
            'final_rating' => 3.17,
            'final_adjectival_rating' => 'Satisfactory',
            'submitted_at' => now(),
            'pmt_action_at' => now(),
        ]);

        $officeSubmission = OpcraAccomplishmentSubmission::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'dept_head_id' => $deptHead->id,
            'status' => 'released',
            'computed_office_rating' => 3.17,
            'final_office_rating' => 3.17,
            'final_adjectival_rating' => 'Satisfactory',
            'submitted_at' => now(),
            'pmt_member_id' => $deptHead->id,
            'pmt_action_at' => now(),
        ]);

        return [
            'office' => $office,
            'period' => $period,
            'dept_head' => $deptHead,
            'employees' => [$employeeOne, $employeeTwo],
            'opcr' => $opcr,
            'submission' => $officeSubmission,
        ];
    }

    private function makeRoleUser(string $role, Office $office, string $name): User
    {
        Role::findOrCreate($role, 'web');

        $user = User::factory()->create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '.', $name)).'@example.com',
            'password' => Hash::make('password'),
            'role' => $role,
            'office_id' => $office->id,
            'position' => ucfirst($role),
            'employee_id' => strtoupper(substr($role, 0, 3)).'-'.uniqid(),
            'is_active' => true,
        ]);

        $user->syncRoles([$role]);

        return $user;
    }
}
