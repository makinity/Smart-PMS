<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PmsEmployeeIdIssuedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $employeeId,
        public string $email,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your PMS Employee ID',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.pms-employee-id-issued',
            with: [
                'name' => $this->name,
                'employeeId' => $this->employeeId,
                'email' => $this->email,
            ],
        );
    }
}
