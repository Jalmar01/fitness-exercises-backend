import pool from '../config/db.js';
import { randomUUID } from 'node:crypto'

export class ExerciseModel{
   static async getAll () {
    const [rows] = await pool.query(
        `SELECT BIN_TO_UUID(e.id) AS id, e.name, e.instructions, e.benefits, c.name AS category_name 
        FROM exercises e 
        INNER JOIN categories c ON e.category_id = c.id 
        WHERE e.is_active = TRUE`
    )
    return rows
}

   static async getById ({id}) {
     const [rows] = await pool.query(
        `SELECT BIN_TO_UUID(e.id) AS id, e.name, e.instructions, e.benefits, c.name AS category_name 
        FROM exercises e 
        INNER JOIN categories c ON e.category_id = c.id
        WHERE e.id = UUID_TO_BIN(?) AND e.is_active = TRUE`, [id])
        
    if(rows.length === 0) return null;
    return rows[0]
}

    static async create ({ name, instructions, benefits, category_id }) {
        // 1. Generamos el UUID en Node.js para tener el control de la llave primaria
        const id = randomUUID();
        
        // 2. Cambiamos UUID() por ? para usar el ID de Node. Ahora hay 5 placeholders para 5 variables.
        await pool.query(
            `INSERT INTO exercises (id, name, instructions, benefits, category_id) 
            VALUES (UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?))`,
            [ id, name, instructions, benefits, category_id ] // <- El arreglo coincide perfecto con los ?
        )
        
        // 3. Retornamos el objeto estructurado con la información real del ejercicio
        return {
            id,
            name,
            instructions,
            benefits,
            category_id
        }
    }

    static async update ({ id, data }) {
    const fields = Object.keys(data)
    if (fields.length === 0) return null 

    // 1. Creamos los SETs dinámicos validando si es category_id para aplicarle UUID_TO_BIN
    const setClause = fields
        .map(field => field === 'category_id' ? `${field} = UUID_TO_BIN(?)` : `${field} = ?`)
        .join(', ')

    // 2. Los valores se quedan exactamente en el mismo orden
    const values = Object.values(data)

    // 3. Ejecutamos la consulta pasándole la cláusula dinámica.
    // Ojo: Pasamos los valores dinámicos y AL FINAL desestructuramos el ID dentro del arreglo de parámetros
    const [ result ] = await pool.query(
        `UPDATE exercises 
         SET ${setClause} 
         WHERE id = UUID_TO_BIN(?) AND is_active = TRUE`, 
        [...values, id] // <- El spread operator une los valores dinámicos con el ID final
    )

    // 4. Si no se modificó ninguna fila (porque el ID no existía o estaba inactivo), retornamos null
    if (result.affectedRows === 0) return null

    // 5. Para cumplir con tu ruta que espera recibir el ejercicio actualizado, hacemos un getById
    return this.getById({ id })
}  
}