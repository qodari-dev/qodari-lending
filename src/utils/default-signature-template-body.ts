export const DEFAULT_SIGNATURE_TEMPLATE_BODY = `
<section>
  <h1 style="text-align: center; margin-bottom: 12px;">Solicitud de firma digital</h1>
  <p>
    Yo, <strong>{{titular_nombre}}</strong>, identificado(a) con documento
    <strong>{{titular_documento}}</strong>, acepto las condiciones del credito
    <strong>{{credit_number}}</strong>.
  </p>
</section>

<section style="margin-top: 14px;">
  <h2 style="font-size: 14px; margin-bottom: 8px;">Datos del credito</h2>
  <table>
    <tbody>
      <tr>
        <td><strong>Monto del credito</strong></td>
        <td>{{monto_credito}}</td>
      </tr>
      <tr>
        <td><strong>Valor cuota</strong></td>
        <td>{{valor_cuota}}</td>
      </tr>
      <tr>
        <td><strong>Numero de cuotas</strong></td>
        <td>{{numero_cuotas}}</td>
      </tr>
      <tr>
        <td><strong>Fecha primer pago</strong></td>
        <td>{{fecha_primer_pago}}</td>
      </tr>
      <tr>
        <td><strong>Fecha vencimiento final</strong></td>
        <td>{{fecha_vencimiento_final}}</td>
      </tr>
    </tbody>
  </table>
</section>

<section style="margin-top: 18px;">
  <p>
    Convenio: <strong>{{convenio_nombre}}</strong> (NIT: {{convenio_nit}})
  </p>
  <p>Direccion convenio: {{convenio_direccion}}</p>
</section>

<section style="margin-top: 28px;">
  <table style="border: none;">
    <tbody>
      <tr>
        <td style="border: none; width: 50%; padding-right: 20px;">
          <p style="margin-bottom: 38px;">Firma titular:</p>
          <div style="border-top: 1px solid #111827;"></div>
          <p style="margin-top: 6px;">{{titular_nombre}}</p>
          <p style="margin-top: 0;">{{titular_documento}}</p>
        </td>
        <td style="border: none; width: 50%; padding-left: 20px;">
          <p style="margin-bottom: 38px;">Firma entidad:</p>
          <div style="border-top: 1px solid #111827;"></div>
          <p style="margin-top: 6px;">Qodari Lending</p>
        </td>
      </tr>
    </tbody>
  </table>
</section>
`.trim();
