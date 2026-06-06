<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;

// Root redirect
Route::get('/', fn () => redirect()->route('login'));

// Role router
Route::get('/dashboard', function () {
    $user = auth()->user();
    if (! $user) return redirect()->route('login');
    $role = $user->getRoleNames()->first() ?? $user->role;
    return match (true) {
        $role === 'admin'      => redirect()->route('admin.dashboard'),
        $role === 'pmt'        => redirect()->route('pmt.dashboard'),
        $role === 'dept-head'  => redirect()->route('dept-head.dashboard'),
        $role === 'supervisor' => redirect()->route('supervisor.dashboard'),
        $role === 'employee'   => redirect()->route('employee.dashboard'),
        default => abort(403),
    };
})->middleware('auth')->name('dashboard');

// Auth
Route::get('/logout', function () {
    Auth::logout();

    request()->session()->invalidate();
    request()->session()->regenerateToken();

    return redirect()->route('login');
})->middleware('auth');

Route::post('/send/id', [\App\Http\Controllers\Auth\ActivationController::class, 'verify'])->middleware('throttle:activation-verify');
Route::post('/activate/complete', [\App\Http\Controllers\Auth\ActivationController::class, 'complete']);

// Admin
Route::prefix('administrator')->middleware(['auth', 'role:admin'])->name('admin.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/users', [\App\Http\Controllers\Admin\UsersController::class, 'index'])->name('users.index');
    Route::post('/users', [\App\Http\Controllers\Admin\UsersController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [\App\Http\Controllers\Admin\UsersController::class, 'update'])->name('users.update');
    Route::post('/users/{user}/send-code', [\App\Http\Controllers\Admin\UsersController::class, 'sendCode'])->name('users.send-code');
    Route::patch('/users/{user}/activate', [\App\Http\Controllers\Admin\UsersController::class, 'activate'])->name('users.activate');
    Route::patch('/users/{user}/deactivate', [\App\Http\Controllers\Admin\UsersController::class, 'deactivate'])->name('users.deactivate');
    Route::patch('/users/{user}/disable', [\App\Http\Controllers\Admin\UsersController::class, 'disable'])->name('users.disable');
    Route::patch('/users/{user}/enable', [\App\Http\Controllers\Admin\UsersController::class, 'enable'])->name('users.enable');
    Route::get('/offices', [\App\Http\Controllers\Admin\OfficeController::class, 'index'])->name('offices.index');
    Route::get('/performance-periods', [\App\Http\Controllers\Admin\PerformancePeriodsController::class, 'index'])->name('performance-periods.index');
    Route::get('/audit-logs', [\App\Http\Controllers\Admin\AuditLogsController::class, 'index'])->name('audit-logs.index');
    Route::get('/database', [\App\Http\Controllers\Admin\DatabaseController::class, 'index'])->name('database.index');
    Route::get('/hris', [\App\Http\Controllers\Admin\HrisIntegrationController::class, 'index'])->name('hris.index');
    Route::get('/hris-integration', [\App\Http\Controllers\Admin\HrisIntegrationController::class, 'index'])->name('hris.integration');
    Route::post('/hris/sync', [\App\Http\Controllers\Admin\HrisIntegrationController::class, 'sync'])->name('hris.sync');
    Route::get('/reports', [\App\Http\Controllers\Admin\ReportsController::class, 'index'])->name('reports.index');
    Route::get('/profile', fn () => \Inertia\Inertia::render('Admin/Profile'))->name('profile');
});

// PMT
Route::prefix('pmt')->middleware(['auth', 'role:pmt'])->name('pmt.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Pmt\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/opcr-review', [\App\Http\Controllers\Pmt\OpcrController::class, 'index'])->name('opcr-review.index');
    Route::get('/opcr-review/{id}', [\App\Http\Controllers\Pmt\OpcrController::class, 'show'])->name('opcr-review.show');
    Route::patch('/opcr-review/{id}/approve', [\App\Http\Controllers\Pmt\OpcrController::class, 'approve'])->name('opcr-review.approve');
    Route::patch('/opcr-review/{id}/return', [\App\Http\Controllers\Pmt\OpcrController::class, 'returnOpcr'])->name('opcr-review.return');
    Route::get('/qar', [\App\Http\Controllers\Pmt\QarController::class, 'index'])->name('qar.index');
    Route::get('/qar/{id}', fn () => \Inertia\Inertia::render('Pmt/Qar/Show'))->name('qar.show');
    Route::get('/uwp', fn () => \Inertia\Inertia::render('Pmt/UnitWorkPlan/Index'))->name('uwp.index');
    Route::get('/accomplishment-review', [\App\Http\Controllers\Pmt\AccomplishmentReviewController::class, 'index'])->name('accomplishment-review.index');
    Route::get('/accomplishment-review/{id}', fn () => \Inertia\Inertia::render('Pmt/AccomplishmentReview/Show'))->name('accomplishment-review.show');
    Route::get('/office-calibration', [\App\Http\Controllers\Pmt\OfficeCalibrationController::class, 'index'])->name('office-calibration.index');
    Route::get('/office-calibration/{id}', fn () => \Inertia\Inertia::render('Pmt/OfficeCalibration/Show'))->name('office-calibration.show');
    Route::get('/employee-calibration', [\App\Http\Controllers\Pmt\EmployeeCalibrationController::class, 'index'])->name('employee-calibration.index');
    Route::get('/employee-calibration/{id}', fn () => \Inertia\Inertia::render('Pmt/EmployeeCalibration/Show'))->name('employee-calibration.show');
    Route::get('/development-planning', [\App\Http\Controllers\Pmt\DevelopmentPlanningController::class, 'index'])->name('development-planning.index');
    Route::get('/development-planning/{id}', fn () => \Inertia\Inertia::render('Pmt/DevelopmentPlanning/Show'))->name('development-planning.show');
    Route::get('/top-performers', [\App\Http\Controllers\Pmt\TopPerformersController::class, 'index'])->name('top-performers.index');
    Route::get('/profile', fn () => \Inertia\Inertia::render('Pmt/Profile'))->name('profile');
});

// Dept Head
Route::prefix('dept-head')->middleware(['auth', 'role:dept-head'])->name('dept-head.')->group(function () {
    Route::get('/', [\App\Http\Controllers\DeptHead\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/uwp', [\App\Http\Controllers\DeptHead\UnitWorkPlanController::class, 'index'])->name('uwp.index');
    Route::get('/uwp/{id}', [\App\Http\Controllers\DeptHead\UnitWorkPlanController::class, 'show'])->name('uwp.show');
    Route::patch('/uwp/{id}/approve', [\App\Http\Controllers\DeptHead\UnitWorkPlanController::class, 'approve'])->name('uwp.approve');
    Route::patch('/uwp/{id}/return', [\App\Http\Controllers\DeptHead\UnitWorkPlanController::class, 'returnUwp'])->name('uwp.return');
    Route::get('/opcr', [\App\Http\Controllers\DeptHead\OpcrController::class, 'index'])->name('opcr.index');
    Route::get('/opcr/{id}', [\App\Http\Controllers\DeptHead\OpcrController::class, 'show'])->name('opcr.show');
    Route::patch('/opcr/{id}/submit', [\App\Http\Controllers\DeptHead\OpcrController::class, 'submit'])->name('opcr.submit');
    Route::get('/qar', [\App\Http\Controllers\DeptHead\QarController::class, 'index'])->name('qar.index');
    Route::get('/qar/{id}', fn () => \Inertia\Inertia::render('DeptHead/Qar/MporShow'))->name('qar.show');
    Route::get('/accomplishment-review', [\App\Http\Controllers\DeptHead\AccomplishmentReviewController::class, 'index'])->name('accomplishment-review.index');
    Route::get('/accomplishment-review/{id}', fn () => \Inertia\Inertia::render('DeptHead/AccomplishmentReview/Show'))->name('accomplishment-review.show');
    Route::get('/profile', fn () => \Inertia\Inertia::render('DeptHead/Profile'))->name('profile');
});

// Supervisor
Route::prefix('supervisor')->middleware(['auth', 'role:supervisor'])->name('supervisor.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Supervisor\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/uwp', [\App\Http\Controllers\Supervisor\UnitWorkPlanController::class, 'index'])->name('uwp.index');
    Route::post('/uwp', [\App\Http\Controllers\Supervisor\UnitWorkPlanController::class, 'store'])->name('uwp.store');
    Route::get('/uwp/{id}/editor', [\App\Http\Controllers\Supervisor\UnitWorkPlanController::class, 'editor'])->name('uwp.editor');
    Route::get('/uwp/{id}', [\App\Http\Controllers\Supervisor\UnitWorkPlanController::class, 'show'])->name('uwp.show');

    // UWP Editor API
    Route::patch('/uwp/{uwp}/draft',  [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'saveDraft'])->name('uwp.draft');
    Route::patch('/uwp/{uwp}/submit', [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'submit'])->name('uwp.submit');

    // Functions
    Route::post  ('/uwp/{uwp}/functions',       [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'storeFunction'])->name('uwp.functions.store');
    Route::patch ('/uwp/{uwp}/functions/{fn}',  [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'updateFunction'])->name('uwp.functions.update');
    Route::delete('/uwp/{uwp}/functions/{fn}',  [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'destroyFunction'])->name('uwp.functions.destroy');

    // MFOs
    Route::post  ('/uwp/{uwp}/mfos',            [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'storeMfo'])->name('uwp.mfos.store');
    Route::patch ('/uwp/{uwp}/mfos/{mfo}',      [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'updateMfo'])->name('uwp.mfos.update');
    Route::delete('/uwp/{uwp}/mfos/{mfo}',      [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'destroyMfo'])->name('uwp.mfos.destroy');

    // Success Indicators
    Route::post  ('/uwp/{uwp}/indicators',          [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'storeIndicator'])->name('uwp.indicators.store');
    Route::patch ('/uwp/{uwp}/indicators/{si}',     [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'updateIndicator'])->name('uwp.indicators.update');
    Route::delete('/uwp/{uwp}/indicators/{si}',     [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'destroyIndicator'])->name('uwp.indicators.destroy');

    // QET Standards
    Route::put('/uwp/{uwp}/indicators/{si}/qet',    [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'saveQet'])->name('uwp.indicators.qet');

    // Assignments
    Route::put('/uwp/{uwp}/indicators/{si}/assign', [\App\Http\Controllers\Supervisor\UwpEditorController::class, 'saveAssign'])->name('uwp.indicators.assign');
    Route::get('/mpor', [\App\Http\Controllers\Supervisor\MporController::class, 'index'])->name('mpor.index');
    Route::get('/mpor/{id}', fn () => \Inertia\Inertia::render('Supervisor/Mpor/Show'))->name('mpor.show');
    Route::get('/accomplishment', [\App\Http\Controllers\Supervisor\AccomplishmentController::class, 'index'])->name('accomplishment.index');
    Route::get('/accomplishment/{id}', fn () => \Inertia\Inertia::render('Supervisor/Accomplishment/Show'))->name('accomplishment.show');
    Route::get('/ors-monitoring', [\App\Http\Controllers\Supervisor\OrsMonitoringController::class, 'index'])->name('ors-monitoring.index');
    Route::post('/ors-monitoring/{orsEntry}/rate', [\App\Http\Controllers\Supervisor\OrsMonitoringController::class, 'rate'])->name('ors-monitoring.rate');
    Route::get('/team-tasks', fn () => \Inertia\Inertia::render('Supervisor/TeamTasks/Index'))->name('team-tasks.index');
    Route::get('/profile', fn () => \Inertia\Inertia::render('Supervisor/Profile'))->name('profile');
});

// Employee
Route::prefix('employee')->middleware(['auth', 'role:employee'])->name('employee.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Employee\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/ipcr-target', [\App\Http\Controllers\Employee\IpcrTargetController::class, 'index'])->name('ipcr-target.index');
    Route::patch('/ipcr-target/{id}/commit', [\App\Http\Controllers\Employee\IpcrTargetController::class, 'commit'])->name('ipcr-target.commit');
    Route::get('/mpor', fn () => \Inertia\Inertia::render('Employee/Mpor/Index'))->name('mpor.index');
    Route::get('/ors', [\App\Http\Controllers\Employee\OrsController::class, 'index'])->name('ors.index');
    Route::post('/ors', [\App\Http\Controllers\Employee\OrsController::class, 'store'])->name('ors.store');
    Route::post('/ors/{orsEntry}/timer', [\App\Http\Controllers\Employee\OrsController::class, 'timerAction'])->name('ors.timer');
    Route::post('/ors/{orsEntry}/submit', [\App\Http\Controllers\Employee\OrsController::class, 'submit'])->name('ors.submit');
    Route::patch('/ors/{orsEntry}', [\App\Http\Controllers\Employee\OrsController::class, 'updateEntry'])->name('ors.update');
    Route::get('/ors/{orsEntry}/entry', [\App\Http\Controllers\Employee\OrsController::class, 'getEntry'])->name('ors.entry');
    Route::get('/my-tasks', fn () => \Inertia\Inertia::render('Employee/MyTask/Index'))->name('my-tasks.index');
    Route::get('/accomplishment', [\App\Http\Controllers\Employee\SmporIpcrAccomplishmentController::class, 'index'])->name('accomplishment.index');
    Route::get('/profile', fn () => \Inertia\Inertia::render('Employee/Profile'))->name('profile');
});

// Stage One exports
Route::middleware('auth')->prefix('stage-one')->name('stage-one.')->group(function () {
    Route::get('/planning/opcr-review', [\App\Http\Controllers\StageOne\Planning\OpcrPmtReviewController::class, 'index'])->name('planning.opcr-review');
    Route::get('/forms/ipcr-export',    [\App\Http\Controllers\StageOne\Forms\IpcrExportController::class, 'export'])->name('forms.ipcr-export');
    Route::get('/forms/ipcr-excel',     [\App\Http\Controllers\StageOne\Forms\IpcrExcelExportController::class, 'export'])->name('forms.ipcr-excel');
    Route::get('/forms/opcr-export',    [\App\Http\Controllers\StageOne\Forms\OpcrExportController::class, 'export'])->name('forms.opcr-export');
    Route::get('/forms/opcr-excel',     [\App\Http\Controllers\StageOne\Forms\OpcrExcelExportController::class, 'export'])->name('forms.opcr-excel');
    Route::get('/forms/uwp-export',     [\App\Http\Controllers\StageOne\Forms\UwpExportController::class, 'export'])->name('forms.uwp-export');
    Route::get('/forms/uwp-excel',      [\App\Http\Controllers\StageOne\Forms\UwpExcelExportController::class, 'export'])->name('forms.uwp-excel');
});

// Stage Two exports
Route::middleware('auth')->prefix('stage-two')->name('stage-two.')->group(function () {
    Route::get('/commitment/ors',          [\App\Http\Controllers\StageTwo\Commitment\OrsController::class, 'index'])->name('commitment.ors');
    Route::get('/commitment/my-tasks',     [\App\Http\Controllers\StageTwo\Commitment\MyTasksController::class, 'index'])->name('commitment.my-tasks');
    Route::get('/monitoring/ors',          [\App\Http\Controllers\StageTwo\Monitoring\OrsMonitoringController::class, 'index'])->name('monitoring.ors');
    Route::get('/monitoring/team-tasks',   [\App\Http\Controllers\StageTwo\Monitoring\TeamTasksController::class, 'index'])->name('monitoring.team-tasks');
    Route::get('/mpor',                    [\App\Http\Controllers\StageTwo\Mpor\MporController::class, 'index'])->name('mpor');
    Route::get('/planning/mpor-submission',[\App\Http\Controllers\StageTwo\Planning\MporSubmissionController::class, 'index'])->name('planning.mpor-submission');
    Route::get('/planning/pmt-qar',        [\App\Http\Controllers\StageTwo\Planning\PmtQarApprovalController::class, 'index'])->name('planning.pmt-qar');
    Route::get('/planning/supervisor-mpor',[\App\Http\Controllers\StageTwo\Planning\SupervisorMporController::class, 'index'])->name('planning.supervisor-mpor');
    Route::get('/planning/supervisor-mpor-endorse', [\App\Http\Controllers\StageTwo\Planning\SupervisorMporEndorseController::class, 'index'])->name('planning.supervisor-mpor-endorse');
    Route::get('/forms/ipcr-export',  [\App\Http\Controllers\StageTwo\Forms\IpcrExportController::class, 'export'])->name('forms.ipcr-export');
    Route::get('/forms/ipcr-excel',   [\App\Http\Controllers\StageTwo\Forms\IpcrExcelExportController::class, 'export'])->name('forms.ipcr-excel');
    Route::get('/forms/mpor-excel',   [\App\Http\Controllers\StageTwo\Forms\MporExcelExportController::class, 'export'])->name('forms.mpor-excel');
    Route::get('/forms/mpor-export',  [\App\Http\Controllers\StageTwo\Forms\MporExportController::class, 'export'])->name('forms.mpor-export');
    Route::get('/forms/ors-export',   [\App\Http\Controllers\StageTwo\Forms\OrsExportController::class, 'export'])->name('forms.ors-export');
    Route::get('/forms/qar-export',   [\App\Http\Controllers\StageTwo\Forms\QarExportController::class, 'export'])->name('forms.qar-export');
    Route::get('/forms/smpor-excel',  [\App\Http\Controllers\StageTwo\Forms\SmporExcelExportController::class, 'export'])->name('forms.smpor-excel');
    Route::get('/forms/smpor-export', [\App\Http\Controllers\StageTwo\Forms\SmporExportController::class, 'export'])->name('forms.smpor-export');
});

// Stage Three exports
Route::middleware('auth')->prefix('stage-three')->name('stage-three.')->group(function () {
    Route::get('/forms/ipcr-export', [\App\Http\Controllers\StageThree\Forms\IpcrExportController::class, 'export'])->name('forms.ipcr-export');
    Route::get('/forms/opcr-excel',  [\App\Http\Controllers\StageThree\Forms\OpcrExcelExportController::class, 'export'])->name('forms.opcr-excel');
    Route::get('/forms/opcr-export', [\App\Http\Controllers\StageThree\Forms\OpcrExportController::class, 'export'])->name('forms.opcr-export');
});
