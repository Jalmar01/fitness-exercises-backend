# 🏋️‍♂️ Fitness Database API

Una API REST robusta y escalable para la gestión de ejercicios y categorías fitness, construida con **Node.js**, **Express** y **MySQL**. El proyecto está diseñado siguiendo buenas prácticas de desarrollo backend, incluyendo validación estricta de datos, persistencia relacional con UUIDs binarios y borrado lógico (_Soft Delete_).

---

## 🚀 Características Principales

- **Arquitectura Limpia:** Separación de responsabilidades mediante el patrón Ruta-Modelo.
- **Base de Datos Relacional:** Relación de uno a muchos (`1:N`) entre Categorías y Ejercicios.
- **UUIDs Eficientes:** Uso de identificadores únicos universales (UUIDv4) optimizados mediante conversión a binario (`BINARY(16)`) en MySQL para mejorar el rendimiento de indexación.
-
