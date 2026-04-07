<!DOCTYPE html>
<html>
<head>
    <title>Bienvenido a ICEP</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #2b6cb0;">¡Hola {{ $lead->name }}!</h2>
        <p style="font-size: 16px; color: #4a5568;">Gracias por tu interés en los programas de <strong>ICEP</strong>.</p>
        <p style="font-size: 16px; color: #4a5568;">Mi nombre es <strong>{{ $advisor->name }}</strong>, seré tu asesor académico y te acompañaré en todo tu proceso de inscripción.</p>
        <div style="background-color: #ebf8fa; border-left: 4px solid #3182ce; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #2c5282;"><strong>Mis datos de contacto:</strong></p>
            <ul style="color: #4a5568;">
                <li>Email: {{ $advisor->email }}</li>
                @if($advisor->phone) <li>Teléfono / WhatsApp: {{ $advisor->phone }}</li> @endif
            </ul>
        </div>
        <p style="font-size: 16px; color: #4a5568;">Estaré comunicándome contigo muy pronto para brindarte toda la información y resolver cualquier duda que tengas.</p>
        <p style="font-size: 16px; color: #4a5568;">¡Un cordial saludo!<br><strong>El equipo de ICEP</strong></p>
    </div>
</body>
</html>
