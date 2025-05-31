const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Iniciando compilação e execução TypeScript...');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executando: ${command}`);
   
    const process = spawn('sh', ['-c', command], { stdio: 'inherit' });
   
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`Comando executado com sucesso: ${command}`);
        resolve();
      } else {
        console.error(`Comando falhou com código ${code}: ${command}`);
        reject(new Error(`Comando saiu com código ${code}`));
      }
    });
   
    process.on('error', (err) => {
      console.error(`Falha ao iniciar comando: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  try {
  
    const tsconfigPath = path.join(__dirname, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      console.error('❌ Erro: arquivo tsconfig.json não encontrado em:', tsconfigPath);
      process.exit(1);
    }


    console.log('🔨 Compilando TypeScript...');
    await runCommand('npm run build');
    console.log('✅ Compilação TypeScript concluída');


    const mainJsPath = path.join(__dirname, 'dist', 'src', 'main.js');
    if (!fs.existsSync(mainJsPath)) {
      console.error('❌ Erro: Não foi possível encontrar o arquivo main.js na pasta dist.');
      process.exit(1);
    }


    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log('📊 Gerando cliente Prisma...');
      await runCommand(`npx prisma generate --schema="./prisma/schema.prisma"`);
      console.log('✅ Cliente Prisma gerado com sucesso');
    }

    console.log('🚀 Iniciando aplicação principal...');
    await runCommand('node dist/main.js');
   
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
    process.exit(1);
  }
}

main();