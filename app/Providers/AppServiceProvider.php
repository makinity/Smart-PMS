<?php

namespace App\Providers;

use App\Services\AssignmentAi\AssignmentPredictorInterface;
use App\Services\AssignmentAi\SimulatedAssignmentPredictor;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Assignment suitability predictor. Swap SimulatedAssignmentPredictor for
        // MlAssignmentPredictor once the model and datasets are ready.
        $this->app->bind(AssignmentPredictorInterface::class, SimulatedAssignmentPredictor::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $host = request()->getHost();
        $localHosts = ['smart-pms.test', '127.0.0.1', 'localhost'];

        if ($host && ! in_array($host, $localHosts)) {
            $scheme = request()->header('X-Forwarded-Proto', 'https');
            URL::forceRootUrl("{$scheme}://{$host}");
            URL::forceScheme($scheme);
        }
    }
}
