<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$all = \App\Models\QarHeader::orderBy('performance_period_id')->orderBy('quarter_key')->get();
foreach ($all as $q) {
    echo "period={$q->performance_period_id} key={$q->quarter_key} status={$q->status} pmt_status={$q->pmt_status}\n";
}
