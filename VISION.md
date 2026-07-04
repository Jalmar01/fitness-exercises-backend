# 🏋️ Fitness CRM API — Vision Document

> **Propósito de este archivo:** Cada vez que arranques a laburar, leelo y recordá adónde vamos.

---

## ¿Qué estamos construyendo?

Una **API REST profesional** para la gestión completa de un gimnasio (CRM). No es una app de ejercicios pública — es el backend que un gimnasio real usaría para administrar alumnos, entrenadores, rutinas y progreso.

## Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Runtime | Node.js (ESM) | Tipado dinámico, ecosistema maduro |
| Framework | Express 5 | Liviano, flexible, sin magia |
| Base de datos | MySQL (mysql2/promise) | Relacional, madura, UUIDs binarios |
| Validación | Zod | Schemas declarativos, tipado inferido |
| Tests | Vitest + Supertest _(pendiente)_ | Rápido, ESM nativo |
| Documentación API | OpenAPI _(pendiente)_ | Estándar de la industria |

---

## Dominios del sistema (data model core)

```
                    ┌─────────────┐
                    │   Miembros   │
                    │  (alumnos)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐     ┌─────▼──────┐     ┌─────▼──────┐
   │  Planes   │     │  Sesiones   │     │  Progreso   │
   │ (rutinas) │◄────┤ (logs de   │     │ (medidas,   │
   │           │     │  entreno)  │     │  peso, PRs) │
   └────┬──────┘     └────────────┘     └────────────┘
        │
   ┌────▼──────┐
   │ Ejercicios │◄──── Categorías / Grupos musculares
   └────────────┘
```

## Roles de usuario

| Rol | Qué puede hacer |
|-----|----------------|
| **Admin** | CRUD todo, gestionar usuarios, ver reportes |
| **Entrenador** | Crear rutinas, asignar planes, ver progreso de sus alumnos |
| **Alumno** | Ver sus rutinas, loggear sesiones, ver su progreso |

---

## Roadmap por fases

### Fase 1 — Catálogo fundacional ✅▶️
- [x] CRUD ejercicios (base armada, DELETE roto)
- [ ] CRUD categorías completo
- [ ] Grupos musculares
- [ ] Equipamiento
- [ ] Middleware de errores consistente
- [ ] Tests (Vitest + Supertest)

### Fase 2 — Infraestructura profesional
- [ ] Sistema de errores uniforme (Problem Details RFC 9457)
- [ ] Logging estructurado
- [ ] Rate limiting
- [ ] Documentación OpenAPI / Swagger
- [ ] Migraciones de DB (Knex o similar)
- [ ] CI con GitHub Actions (lint + test)

### Fase 3 — Usuarios y autenticación
- [ ] Registro y login con JWT
- [ ] Middleware de autorización por roles
- [ ] Perfiles de usuario (admin, entrenador, alumno)

### Fase 4 — Rutinas / Planes de entrenamiento
- [ ] CRUD de rutinas
- [ ] Asignación de rutinas a miembros
- [ ] Plantillas reutilizables

### Fase 5 — Tracking y progreso
- [ ] Log de sesiones (ejercicio, series, reps, peso, RPE)
- [ ] Historial de entrenamiento por miembro
- [ ] Métricas de progreso (peso corporal, medidas, PRs)

### Fase 6 — Producción
- [ ] Deploy (Render, Railway, o el que toque)
- [ ] Monitoreo básico
- [ ] Backup de DB

---

## Principios de arquitectura

1. **Consistencia sobre frameworks** — patrones simples y repetibles, no abstracciones prematuras
2. **Ruta → Modelo → DB** — sin capas inventadas, el patrón actual es suficiente hasta Fase 2
3. **Validación en el borde** — Zod en los schemas, nunca confiar en el cliente
4. **Soft delete siempre** — `is_active`, nunca perder datos
5. **UUIDs como PK** — binarios para performance, string en API
6. **Tests primero** — cuando llegue Vitest, cada nuevo endpoint nace con test

---

## Decisiones registradas

| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-07-03 | Soft delete sobre hard delete | Consistencia con modelo existente, trazabilidad |
| 2026-07-03 | Zod para validación sobre Joi/Yup | Tipado inferido, ecosistema moderno, ESM nativo |
| 2026-07-03 | UUIDs binarios (BINARY(16)) sobre UUID strings | Performance de indexación en MySQL |

---

## Próximo cambio

Terminar el fix del DELETE (`models/exercise.js` + `routes/exerceses.js`) y de paso arrancar con Vitest para testearlo.
