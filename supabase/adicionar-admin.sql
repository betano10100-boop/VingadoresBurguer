-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- depois de criar o usuário betano10100@gmail.com em Authentication > Users.

INSERT INTO usuarios_admin (id, usuario)
SELECT id, 'betano10100'
FROM auth.users
WHERE email = 'betano10100@gmail.com'
ON CONFLICT (id) DO UPDATE
SET usuario = excluded.usuario;
