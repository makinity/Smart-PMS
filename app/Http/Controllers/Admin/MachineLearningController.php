<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class MachineLearningController extends Controller
{
    private function fastapiUrl(): string
    {
        return AppSetting::get('fastapi_url', env('FASTAPI_URL', 'http://127.0.0.1:8000'));
    }

    public function index()
    {
        $logs = DB::table('ml_model_logs')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $modelExists = DB::table('ml_model_logs')->where('status', 'success')->exists();
        $lastSuccess = DB::table('ml_model_logs')
            ->where('status', 'success')
            ->orderByDesc('trained_at')
            ->first();

        return Inertia::render('Admin/MachineLearning/Index', [
            'logs'        => $logs,
            'modelExists' => $modelExists,
            'lastTrained' => $lastSuccess?->trained_at,
            'rowCount'    => DB::table('employee_performance_snapshots')->count(),
            'mlUrl'       => $this->fastapiUrl(),
        ]);
    }

    public function updateMlUrl(Request $request)
    {
        $request->validate(['url' => 'required|url|max:500']);
        AppSetting::set('fastapi_url', rtrim($request->url, '/'));

        return back()->with('success', 'ML API URL updated successfully.');
    }

    public function trainSql()
    {
        try {
            $response = Http::timeout(5)->post("{$this->fastapiUrl()}/ml/train-sql");
            if ($response->failed()) {
                return back()->with('error', 'Failed to trigger SQL training.');
            }
        } catch (\Exception $e) {
            return back()->with('error', 'FastAPI is not reachable. Please ensure it is running.');
        }

        return back()->with('success', 'SQL training started in background.');
    }

    public function trainCsv(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:20480']);

        $file = $request->file('file');

        try {
            $response = Http::timeout(10)
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("{$this->fastapiUrl()}/ml/train-csv");

            if ($response->failed()) {
                return back()->with('error', 'Failed to trigger CSV training.');
            }
        } catch (\Exception $e) {
            return back()->with('error', 'FastAPI is not reachable. Please ensure it is running.');
        }

        return back()->with('success', 'CSV training started in background.');
    }

    public function logs()
    {
        return response()->json(
            DB::table('ml_model_logs')->orderByDesc('id')->limit(50)->get()
        );
    }
}
