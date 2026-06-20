<?php
define('LARAVEL_START', microtime(true));
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$rowena = App\Models\User::where('email','employee5@pms.test')->first();
$ipcr = App\Models\Ipcr::where('employee_id',$rowena->id)->with('performancePeriod')->first();
$period = $ipcr->performancePeriod;

$service = app(App\Services\PerformanceRatingService::class);

$year = $period->start_date->year;
$q1Start = Carbon\Carbon::create($year, $period->start_date->month, 1)->startOfDay();
$q1End   = $q1Start->copy()->addMonths(2)->endOfMonth()->endOfDay();
$q2Start = $q1End->copy()->addDay()->startOfDay();
$q2End   = Carbon\Carbon::parse($period->end_date)->endOfDay();

echo "Q1 window: {$q1Start->toDateString()} → {$q1End->toDateString()}\n";
echo "Q2 window: {$q2Start->toDateString()} → {$q2End->toDateString()}\n\n";

[$q1Ratings] = $service->buildRatedIpcrPerformanceMaps($ipcr, $q1Start, $q1End);
[$q2Ratings] = $service->buildRatedIpcrPerformanceMaps($ipcr, $q2Start, $q2End);

echo "Q1 ratings by output:\n";
foreach($q1Ratings as $title => $r) echo "  {$title}: Q={$r['q']} E={$r['e']} T={$r['t']} A={$r['a']}\n";

echo "\nQ2 ratings by output:\n";
foreach($q2Ratings as $title => $r) echo "  {$title}: Q={$r['q']} E={$r['e']} T={$r['t']} A={$r['a']}\n";
