<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maintenance — Smart PMS</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #0a0f1a 0%, #0f1724 100%);
            color: #f4f8ff;
            padding: 2rem 1rem;
        }
        .card {
            width: 100%;
            max-width: 440px;
            background: rgba(16,23,34,0.96);
            border: 1px solid rgba(59,130,246,0.22);
            border-radius: 12px;
            box-shadow: 0 18px 40px rgba(0,0,0,0.28);
            padding: 2.5rem 2rem;
            text-align: center;
        }
        .icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(59,130,246,0.1);
            border: 1.5px solid rgba(59,130,246,0.2);
            margin-bottom: 1.5rem;
        }
        .icon svg { width: 32px; height: 32px; stroke: #3b82f6; }
        .label {
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #3b82f6;
            margin-bottom: 0.5rem;
        }
        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 0.65rem;
        }
        p {
            font-size: 0.9rem;
            color: #6f83a6;
            line-height: 1.6;
        }
        .divider {
            border-top: 1px solid rgba(140,171,214,0.12);
            margin: 1.75rem 0 1.25rem;
        }
        footer {
            margin-top: 1.5rem;
            font-size: 0.75rem;
            color: #6f83a6;
        }
    </style>
</head>
<body>
    <div>
        <div class="card">
            <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
            </div>
            <div class="label">503 — Maintenance</div>
            <h1>We'll be right back</h1>
            <p>Smart PMS is currently undergoing scheduled maintenance. Please check back in a few minutes.</p>
            <div class="divider"></div>
            <p>If this is urgent, please contact your system administrator.</p>
        </div>
        <footer>© {{ date('Y') }} Smart PMS</footer>
    </div>
</body>
</html>
