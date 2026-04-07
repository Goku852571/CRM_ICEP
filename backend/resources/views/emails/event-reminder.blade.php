<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Recordatorio de Evento - ICEP</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 40px; color: #45464d; }
        .card { background: #ffffff; border-radius: 24px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
        .header { background: #008cc7; padding: 40px; text-align: center; color: white; }
        .content { padding: 40px; }
        h1 { margin: 0 0 10px; font-size: 24px; font-weight: 800; }
        p { line-height: 1.6; font-size: 14px; margin: 0 0 20px; }
        .details { background: #f9fbfc; border-radius: 16px; padding: 24px; margin-bottom: 30px; border: 1px solid #edf2f4; }
        .detail-item { margin-bottom: 12px; font-size: 13px; font-weight: 600; }
        .label { text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-size: 10px; margin-bottom: 4px; display: block; }
        .btn { display: inline-block; padding: 16px 32px; background: #008cc7; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(0,140,199,0.2); }
        .footer { text-align: center; padding: 30px; font-size: 11px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1 style="color:#ffffff">📅 Próximo Evento</h1>
            <p style="opacity: 0.8; margin-bottom:0">Agenda Institucional ICEP</p>
        </div>
        <div class="content">
            <p>Hola <strong>{{ $user->name }}</strong>,</p>
            <p>Este es un recordatorio automático de que el siguiente evento está por comenzar:</p>
            
            <div class="details">
                <div class="detail-item">
                    <span class="label">Evento</span>
                    {{ $event->title }}
                </div>
                <div class="detail-item">
                    <span class="label">Horario</span>
                    {{ \Carbon\Carbon::parse($event->start_date)->format('d M, Y - h:i A') }}
                </div>
                @if($event->description)
                <div class="detail-item">
                    <span class="label">Notas</span>
                    {{ $event->description }}
                </div>
                @endif
            </div>

            @if($event->meeting_link)
            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #9ca3af; margin-bottom: 15px;">Accede a la reunión virtual desde aquí:</p>
                <a href="{{ $event->meeting_link }}" class="btn">Unirse a la Reunión</a>
            </div>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} ICEP — Sistema de Gestión Académica.<br>
            Este es un correo automático, por favor no respondas.
        </div>
    </div>
</body>
</html>
