<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
