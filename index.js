// Importação dos pacotes
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Configuração do Express
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Essencial para permitir que o frontend (Netlify) acesse a API
app.use(express.json()); // Para o Express entender requisições com corpo em JSON

// Configuração do Banco de Dados (PostgreSQL)
// O Railway injetará a variável de ambiente DATABASE_URL automaticamente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para criar a tabela de usuários se ela não existir
const createTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log('Tabela "users" verificada/criada com sucesso.');
  } catch (err) {
    console.error('Erro ao criar a tabela "users":', err.stack);
  }
};

// --- ROTAS DA API ---

// Rota [GET] /users - Retorna o nome de todos os usuários
app.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name FROM users ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota [POST] /users - Cria um novo usuário
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  try {
    const queryText = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email';
    const { rows } = await pool.query(queryText, [name, email]);
    res.status(201).json(rows[0]);
  } catch (err) {
    // Código '23505' é erro de violação de chave única (email duplicado)
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }
    console.error('Erro ao inserir usuário:', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  // Garante que a tabela exista ao iniciar o servidor
  createTable();
});