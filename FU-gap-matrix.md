# Matriz Base de Cumplimiento FU (schema-menu lending)

Fecha de corte: 2026-02-15

Criterio usado:
- Cumple: se observa soporte funcional y evidencia en menu/esquema/handler.
- Parcial: existe estructura o pantalla, pero el proceso de negocio esta incompleto, en TODO o sin integracion externa.
- Disenar: no se encontro evidencia funcional suficiente en schema-menu/codigo para afirmar cobertura.

Evidencia base revisada:
- `src/components/sidebar/app-sidebar.tsx`
- `src/schemas/*`
- `src/server/db/schema.ts`
- `src/server/api/handlers/*`

## FU1 - Parametrizacion

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU1.1 | Cumple | Modulos de creditos, fondos, tasas, plazos y condiciones (`credit-products`, `credit-funds`, `credits-settings`). | - |
| FU1.2 | Cumple | Categorias A/B/C en producto y factores por categoria (`category_code`, `credit_product_categories`). | - |
| FU1.3 | Parcial | Hay reglas con vigencia en conceptos (`billing_concept_rules.effectiveFrom/effectiveTo`). | No existe modulo explicito de campanas temporales comerciales por producto. |
| FU1.4 | Cumple | Conceptos parametrizables (interes corriente, mora, fee, guarantee/FGA, other). | - |
| FU1.5 | Parcial | Politicas de aplicacion y prelacion parametrizadas (`payment_allocation_policies/rules`). | Motor de aplicacion en `loan-payment` no usa claramente la politica parametrizada. |
| FU1.6 | Cumple | Perfiles de facturacion por producto y convenio (`billing_cycle_profiles`). | - |
| FU1.7 | Parcial | Fondos y presupuestos parametrizados (`credit_funds`, `credit_fund_budgets`). | Control operativo estricto de saldo disponible en desembolso no es evidente. |
| FU1.8 | Cumple | Edades de mora y buckets con provision (`aging_profiles`, `aging_buckets`). | - |
| FU1.9 | Cumple | Reglas de mora por dias minimos/rangos (`credit_product_late_interest_rules`). | - |
| FU1.10 | Cumple | Politica de refinanciacion y consolidacion parametrizable (`credit_product_refinance_policies`). | - |

## FU2 - Solicitud

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU2.1 | Disenar | No hay evidencia de integracion especifica Comfeweb/Oficina Virtual. | Definir contrato API, autenticacion, trazabilidad y mapeo de estados. |
| FU2.2 | Disenar | No hay evidencia de integracion especifica AppComfenalco. | Definir integracion de canal movil y flujo de ingestion. |
| FU2.3 | Parcial | Existe modelo de evaluacion de riesgo (`loan_application_risk_assessments`). | Integracion real con motor/plataforma externa no esta implementada en handler. |
| FU2.4 | Parcial | Solicitudes con estado, historial y canal (`loan_applications`, `loan_application_status_history`, `channelId`). | Ingreso desde canales externos no es visible (hoy parece flujo interno). |
| FU2.5 | Parcial | Estado visible para usuario interno (pantallas solicitudes). | Portal/consulta externa para cliente/empresa no es visible. |
| FU2.6 | Cumple | Trazabilidad completa interna de ciclo (create/update/cancel/reject/approve + historico + auditoria). | - |

## FU3 - Desembolso

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU3.1 | Parcial | Estados de credito y desembolso existen (`status`, `disbursementStatus`). | Flujo completo multiestado de desembolso bancario no se ve cerrado end-to-end. |
| FU3.2 | Parcial | Hay simulacion de refinanciacion y consulta de saldos. | Abonos automaticos de creditos previos en desembolso no estan implementados. |
| FU3.3 | Disenar | No se observa calculo explicito de interes por dias de ajuste giro-primera cuota. | Disenar regla, formula y asiento asociado. |
| FU3.4 | Disenar | No se observa descuento automatico de interes de ajuste del valor a girar. | Disenar y conectar a liquidacion/desembolso. |
| FU3.5 | Parcial | Se generan asientos al liquidar credito (`loan.liquidate`). | Validar que cubra exactamente dinamica CxP esperada por negocio. |
| FU3.6 | Parcial | Modulo `bank-files` y codigo asobancaria en banco. | `bank-file` esta en TODO/demo, sin formato oficial definitivo. |
| FU3.7 | Disenar | No hay evidencia de CAF/PBF Redeban para cupocredito. | Disenar layout, validaciones y generador. |
| FU3.8 | Parcial | Parametrizacion de fondos existe. | Control de uso/saldo en tiempo real durante desembolso no es evidente. |
| FU3.9 | Disenar | No hay envio de correo de confirmacion de desembolso visible en backend. | Disenar notificacion (afiliado + empleador + plan + descuentos). |
| FU3.10 | Parcial | Existe modulo de interfaz contable. | `accounting-interface` esta TODO, sin integracion SAP FI real. |

## FU4 - Facturacion

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU4.1 | Disenar | Hay parametrizacion de conceptos/ciclos. | No se evidencia motor de facturacion masiva/individual ejecutable. |
| FU4.2 | Parcial | Endpoint de causacion interes corriente existe. | `causation` esta en TODO/demo. |
| FU4.3 | Disenar | No se observa flujo formal de prefactura-validacion-confirmacion. | Disenar estados y control de aprobacion analista. |
| FU4.4 | Parcial | Calendario/ciclos parametrizables por perfil de facturacion. | No se observa scheduler anual automatico de ejecucion. |
| FU4.5 | Disenar | No hay reporte especifico de novedades a empleador (altas/bajas). | Disenar reporte + canal de entrega. |
| FU4.6 | Parcial | Conceptos adicionales existen (FEE/GUARANTEE/LATE_INTEREST). | Aplicacion operativa en facturacion real aun no visible. |
| FU4.7 | Cumple | Reglas parametrizables de mora por edad minima/rangos. | - |
| FU4.8 | Cumple | Ciclos por producto y pagaduria configurables (`billing_cycle_profiles`). | - |
| FU4.9 | Parcial | Hay extracto de credito y plantillas PDF. | Documento formal de factura/archivo de descuento por empleador no esta claro. |
| FU4.10 | Disenar | No hay evidencia de extracto DIAN electronico normativo. | Disenar facturacion electronica DIAN (documento, firma, validacion, eventos). |
| FU4.11 | Disenar | No hay log descargable de proceso facturacion+DIAN end-to-end. | Disenar bitacora auditable por lote/documento. |

## FU5 - Aplicacion de pagos

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU5.1 | Parcial | `loan-payment` aplica pagos, genera contabilidad y afecta cartera. | Controles antifraude dedicados no son evidentes. |
| FU5.2 | Parcial | Pantallas/contratos para abono por archivo y por libranza. | `loan-payment-file` y `loan-payment-payroll` estan en TODO. |
| FU5.3 | Disenar | No hay portal externo de autogestion para empresas. | Disenar autoservicio B2B (pagos+novedades). |
| FU5.4 | Parcial | Modelo de libranza contempla montos y excedentes. | Registro operacional de diferencias facturado vs pagado aun no implementado. |
| FU5.5 | Parcial | Se aceptan pagos parciales; aplicacion al saldo abierto. | Falta asegurar uso de prelacion parametrizada en motor real. |
| FU5.6 | Disenar | No se evidencia modo de abono extraordinario con opciones (capital/plazo/cuotas). | Disenar modalidades y recalculo contractual. |

## FU6 - Cierre contable

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU6.1 | Parcial | Existe modulo de interfaz contable por proceso. | Todos los procesos en `accounting-interface` estan TODO. |
| FU6.2 | Disenar | Hay dashboard general de negocio. | No se observa tablero de conciliacion SAP FI vs lending. |

## FU7 - Reportes y control

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU7.1 | Parcial | Muchas vistas de reportes (credito/cartera/indicadores). | `portfolio-report` y gran parte de `credit-report` estan en demo/TODO. |
| FU7.2 | Cumple | Rangos parametrizables via `aging_profiles` y `aging_buckets`. | - |
| FU7.3 | Parcial | Existen reportes CIFIN/Datacredito. | `risk-center-report` esta en TODO/demo (no oficial mensual automatico). |
| FU7.4 | Parcial | Dashboard con KPIs de solicitudes, recaudo, fondos y tendencias. | KPI de mora por producto/antiguedad cartera oficial requiere completar reportes de cartera reales. |
| FU7.5 | Parcial | Estructuras/reportes incluyen tercero y convenio. | Varios reportes aun demo impiden granularidad confiable productiva. |

## FU8 - Provision de cartera

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU8.1 | Parcial | Modelo de edades/provision existe. | Proceso automatico de calificacion/cierre aun en TODO (causacion/cierre). |
| FU8.2 | Cumple | Porcentajes de provision por rango configurables (`provisionRate`). | - |
| FU8.3 | Parcial | Tablas snapshot y modulo interfaz provision existen. | Calculo+contabilizacion automatica aun no implementados end-to-end. |
| FU8.4 | Parcial | Modelo de snapshots de provision soporta trazabilidad. | Falta ejecucion real del proceso para poblar trazabilidad operativa. |

## FU9 - Castigo de cartera

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU9.1 | Parcial | Politica de castigo parametrizable por producto (`charge_off_policies`). | `loan-write-off` esta en demo/TODO para ejecucion real. |
| FU9.2 | Disenar | Hay campos de castigo en `loans`. | Contabilizacion real del castigo afectando provision no implementada. |
| FU9.3 | Parcial | Se pueden marcar estados/campos de castigo en modelo. | Seguimiento posterior operativo/reportable no esta cerrado. |
| FU9.4 | Disenar | No hay reporte especifico de cartera castigada para centrales. | Disenar reporte regulatorio de castigos. |

## FU10 - Gestion de la cartera

| ID | Estado | Que hay hoy | Brecha |
|---|---|---|---|
| FU10.1 | Disenar | Hay base de conceptos/ciclos/causacion. | Automatizacion de facturacion + extractos DIAN sin soporte adicional no esta implementada. |
| FU10.2 | Disenar | Dashboard general disponible. | No hay tablero de conciliacion y errores de facturacion especificamente. |
| FU10.3 | Disenar | Modulos internos de pagos/novedades. | No existe autogestion empresarial externa completa. |
| FU10.4 | Disenar | No se evidencia motor de facturacion puntual para retirados en mora. | Disenar regla de elegibilidad + lote puntual + auditoria. |
| FU10.5 | Parcial | Existe marca/fecha de acuerdo de pago por credito. | No existe motor de reestructuracion con nuevas condiciones financieras. |
| FU10.6 | Disenar | No hay seguimiento automatico de cumplimiento/incumplimiento de acuerdos. | Disenar eventos, semaforos y acciones automaticas. |
| FU10.7 | Disenar | No hay parametrizacion de perdida de beneficios por incumplimiento. | Disenar politicas de beneficio/sancion y aplicacion automatica. |

## Resumen por bloque

| Bloque | Cumple | Parcial | Disenar |
|---|---:|---:|---:|
| FU1 | 7 | 3 | 0 |
| FU2 | 1 | 3 | 2 |
| FU3 | 0 | 6 | 4 |
| FU4 | 2 | 5 | 4 |
| FU5 | 0 | 5 | 1 |
| FU6 | 0 | 1 | 1 |
| FU7 | 2 | 4 | 0 |
| FU8 | 1 | 3 | 0 |
| FU9 | 0 | 2 | 2 |
| FU10 | 0 | 1 | 6 |
| **Total (67 reqs)** | **13** | **33** | **21** |

## Observaciones criticas

1. Lo mas maduro hoy: parametrizacion (FU1), ciclo de solicitud-aprobacion (FU2 parcial alto), liquidacion/abono individual con contabilidad interna.
2. Brecha principal: facturacion real (masiva/individual), DIAN, y reporteria regulatoria oficial.
3. Integraciones externas clave aun pendientes: SAP FI, centrales de riesgo oficiales, archivos bancarios oficiales, canales externos de solicitud.
4. Muchas pantallas ya existen en menu, pero varias APIs de negocio estan en modo demo/TODO.
