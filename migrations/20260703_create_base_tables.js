/**
 * Migration: Create base tables matching the actual MySQL schema.
 *
 * Uses CREATE TABLE IF NOT EXISTS for all tables so it's safe
 * to run against an existing database.
 */
export async function up(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS muscles (
      id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
      name VARCHAR(25) UNIQUE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS categories (
      id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
      name VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS exercises (
      id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
      name VARCHAR(25) UNIQUE,
      instructions TEXT,
      benefits TEXT,
      category_id BINARY(16) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS exercise_muscles (
      exercise_id BINARY(16) NOT NULL,
      muscle_id BINARY(16) NOT NULL,
      role ENUM('primary', 'secondary') NOT NULL,
      PRIMARY KEY (exercise_id, muscle_id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (muscle_id) REFERENCES muscles(id) ON DELETE CASCADE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
      name VARCHAR(25) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(260) NOT NULL
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workouts (
      id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
      user_id BINARY(16) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      workout_id BINARY(16) NOT NULL,
      exercise_id BINARY(16) NOT NULL,
      set_number INT NOT NULL,
      reps INT NOT NULL,
      weight DECIMAL(5, 2),
      PRIMARY KEY (workout_id, exercise_id, set_number),
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    )
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('workout_sets');
  await knex.schema.dropTableIfExists('workouts');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('exercise_muscles');
  await knex.schema.dropTableIfExists('exercises');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('muscles');
}
