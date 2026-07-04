# 🏋️ Fitness CRM API — Vision Document

> **Propósito de este archivo:** Cada vez que arranques a laburar, leelo y recordá adónde vamos.

---

## ¿Qué estamos construyendo?

Una **API REST profesional** para la gestión completa de un gimnasio.

No es una app de ejercicios cualquiera. Es el backend que un gimnasio real usa para administrar su catálogo, sus miembros, sus pagos de mensualidad y su progreso. El dueño del gym (admin) opera el sistema, los miembros registrados trackean su evolución, y cualquiera puede ver el catálogo de ejercicios sin cuenta.

**Meta final:** Un CRM completo que incluya membresías/pagos y planes de dieta.

## Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Runtime | Node.js (ESM) | Tipado dinámico, ecosistema maduro |
| Framework | Express 5 | Liviano, flexible, sin magia |
| Base de datos | MySQL (mysql2/promise) | Relacional, madura, UUIDs binarios |
| Validación | Zod | Schemas declarativos, tipado inferido |
| Tests | Vitest + Supertest | Rápido, ESM nativo |
| Migraciones | Knex | Versionado de esquema de DB |
| Autenticación | JWT + bcryptjs | Access + refresh tokens |

---

## Dominios del sistema (data model core)

```
                    ┌─────────────┐
                    │   Usuarios   │
                    │  (miembros)  │
                    └──────┬──────┘
                           │
         ┌──────────────────┼──────────────────┬──────────────────┐
         │                  │                  │                  │
    ┌────▼─────┐     ┌─────▼──────┐     ┌─────▼──────┐     ┌────▼─────┐
    │  Planes   │     │  Sesiones   │     │  Progreso   │     │  Pagos    │
    │ (rutinas) │◄────┤ (logs de   │     │ (medidas,   │     │(mensuali- │
    │           │     │  entreno)  │     │  peso, PRs) │     │  dades)   │
    └────┬──────┘     └────────────┘     └────────────┘     └──────────┘
         │                                                   
    ┌────▼──────┐          ┌──────────────┐
    │ Ejercicios │◄────────┤  Dieta /     │
    └────┬──────┘          │  Nutrición   │
         │                 └──────────────┘
    ┌────▼──────────┐
    │ Categorías /  │
    │ Grupos Musc.  │
    └───────────────┘
```

## Roles de usuario

| Rol | Qué puede hacer |
|-----|----------------|
| **Super Admin** (dev) | CRUD todo, gestionar usuarios y roles, config. técnica |
| **Admin** (dueño del gym) | CRUD ejercicios, categorías, músculos, ver miembros |
| **User** (miembro del gym) | Ver progreso, loggear sesiones, ver su plan |

---

## Roadmap por fases

### ✅ Fase 1 — Catálogo fundacional
- [x] CRUD ejercicios con soft delete y restore
- [x] CRUD categorías con cascade soft delete
- [x] CRUD músculos con soft delete
- [x] Asociaciones ejercicio-músculo (rol primary/secondary)
- [x] Migraciones con Knex
- [x] Tests (Vitest + Supertest) — 90 tests

### 🔄 Fase 2 — Auth y usuarios
- [ ] Registro público + login con JWT
- [ ] Middleware de autenticación y autorización por roles
- [ ] Admin puede crear usuarios con rol específico
- [ ] Refresh token rotation

### 📋 Fase 3 — Rutinas / Planes de entrenamiento
- [ ] CRUD de rutinas
- [ ] Asignación de rutinas a miembros
- [ ] Días de entrenamiento con ejercicios asignados

### 📊 Fase 4 — Tracking y progreso
- [ ] Log de sesiones (ejercicio, series, reps, peso, RPE)
- [ ] Historial de entrenamiento por miembro
- [ ] Métricas de progreso (peso corporal, medidas, PRs)

### 💳 Fase 5 — Membresías y pagos
- [ ] Planes de membresía (mensual, trimestral, anual)
- [ ] Registro de pagos de mensualidad
- [ ] Control de acceso por membresía activa

### 🥗 Fase 6 — Dieta y nutrición
- [ ] Planes de alimentación por miembro
- [ ] Registro de comidas y macros
- [ ] Seguimiento de objetivos nutricionales

### 🚀 Fase 7 — Producción
- [ ] Deploy (Render, Railway, o el que toque)
- [ ] Monitoreo básico
- [ ] Backup de DB
- [ ] Documentación OpenAPI / Swagger

---

## Principios de arquitectura

1. **Consistencia sobre frameworks** — patrones simples y repetibles, no abstracciones prematuras
2. **Ruta → Controller → Modelo → DB** — capas delgadas, cada una con una responsabilidad
3. **Validación en el borde** — Zod en los controllers, nunca confiar en el cliente
4. **Soft delete siempre** — `is_active`, nunca perder datos
5. **UUIDs como PK** — binarios para performance, string en API
6. **Tests primero** — cada endpoint nace con test

---

## Decisiones registradas

| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-07-03 | Soft delete sobre hard delete | Consistencia con modelo existente, trazabilidad |
| 2026-07-03 | Zod para validación sobre Joi/Yup | Tipado inferido, ecosistema moderno, ESM nativo |
| 2026-07-03 | UUIDs binarios (BINARY(16)) sobre UUID strings | Performance de indexación en MySQL |
| 2026-07-04 | Controllers layer separada de routes | Mantener rutas limpias (10 líneas c/u), lógica en controllers |
| 2026-07-04 | Refresh token en DB plano (sin hash) | Suficiente para el nivel de seguridad necesario, sin complejidad extra |
| 2026-07-04 | GET routes públicas, writes requieren auth | Catálogo visible sin login, solo operaciones de escritura protegidas |

---

## Próximo cambio

Auth y usuarios — Fase 2 del roadmap.
