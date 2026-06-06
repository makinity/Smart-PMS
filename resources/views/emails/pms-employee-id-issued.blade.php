<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your PMS Employee ID</title>
</head>
<body style="margin:0;padding:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border:1px solid #d7e2f5;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
            <div style="padding:24px 28px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;">
                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-bottom:8px;">Smart PMS</div>
                <div style="font-size:24px;font-weight:700;line-height:1.2;">Your Employee ID is ready</div>
            </div>
            <div style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hello {{ $name }},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
                    Your PMS account has been prepared by the administrator. Use the employee ID below together with your Gmail address to activate your account.
                </p>

                <div style="margin:0 0 20px;padding:18px;border:1px solid #cfe0ff;border-radius:14px;background:#f8fbff;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Employee ID</div>
                    <div style="font-size:28px;font-weight:800;letter-spacing:.04em;color:#1d4ed8;">{{ $employeeId }}</div>
                </div>

                <div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8;margin-bottom:10px;">Activation Steps</div>
                    <ol style="margin:0;padding-left:20px;color:#334155;line-height:1.8;font-size:14px;">
                        <li>Open the PMS login page.</li>
                        <li>Select account activation.</li>
                        <li>Enter your employee ID and Gmail address.</li>
                        <li>Set your password after verification.</li>
                    </ol>
                </div>

                <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
                    If you did not expect this email, please contact the administrator.
                </p>
            </div>
        </div>
        <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">This email was sent to {{ $email }}.</p>
    </div>
</body>
</html>
