<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-bs-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

    <!-- SEO Primary Meta Tags -->
    <title>{{ config('app.name', 'Smart-PMS') }} | Strategic Performance Management System</title>
    <meta name="title" content="Smart-PMS | Strategic Performance Management System">
    <meta name="description" content="Official Strategic Performance Management System (SPMS) of the Provincial Government of Davao del Sur. Efficiently manage, monitor, and evaluate IPCR, OPCR, and organizational performance metrics.">
    <meta name="keywords" content="Smart-PMS, SPMS, Davao del Sur, Strategic Performance Management System, IPCR, OPCR, Employee Rating, Civil Service Commission, LGU Davao del Sur">
    <meta name="author" content="Provincial Government of Davao del Sur">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{{ url()->current() }}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="Smart-PMS | Strategic Performance Management System">
    <meta property="og:description" content="Official Strategic Performance Management System (SPMS) of the Provincial Government of Davao del Sur. Track and evaluate performance ratings seamlessly.">
    <meta property="og:image" content="{{ asset('images/pms-logo.png') }}">
    <meta property="og:site_name" content="Smart-PMS">

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Smart-PMS | Strategic Performance Management System">
    <meta name="twitter:description" content="Official Strategic Performance Management System of Davao del Sur.">
    <meta name="twitter:image" content="{{ asset('images/pms-logo.png') }}">

    <!-- Icons -->
    <link rel="icon" type="image/png" href="{{ asset('images/pms-logo.png') }}">
    <link rel="shortcut icon" type="image/png" href="{{ asset('images/pms-logo.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('images/pms-logo.png') }}">

    <!-- Fonts & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/js/app.jsx', 'resources/css/app.css'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
