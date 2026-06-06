-- Diagnóstico: usuários sem unidade vinculada (exceto admins)
-- Execute primeiro para ver quem precisa ser corrigido:
SELECT id, full_name, email, role, unit_number
FROM profiles
WHERE unit_number IS NULL
  AND role != 'admin'
  AND is_active = true
ORDER BY role, full_name;

-- Atribuir unidades fictícias aos condôminos/síndicos sem chácara vinculada.
-- Ajuste os números de chácara conforme a realidade do condomínio.
-- Exemplo abaixo distribui números sequenciais; edite antes de executar.

/*
UPDATE profiles SET unit_number = 10 WHERE email = 'morador1@exemplo.com';
UPDATE profiles SET unit_number = 25 WHERE email = 'morador2@exemplo.com';
-- adicione uma linha por usuário conforme o SELECT acima revelar
*/
