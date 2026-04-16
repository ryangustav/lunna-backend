const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "715201460391444580"; 
  console.log(`Cleaning up existing RPG data for testing...`);
  
  // Clean up to avoid non-nullable field errors with junk data
  await prisma.userItem.deleteMany({ where: { userId } });
  await prisma.item.deleteMany({});

  const mockItems = [
    {
      name: "Espada da Estrela Cadente",
      description: "Uma lâmina lendária forjada com restos de um meteoro que caiu nas montanhas lunares.",
      rarity: "Lendário",
      category: "Equipamentos",
      icon: "/sprites/sword_legendary.png",
      stats: { Ataque: 150, Velocidade: 15 }
    },
    {
      name: "Escudo de Obsidiana",
      description: "Um escudo maciço capaz de absorver impactos de ataques mágicos e físicos.",
      rarity: "Épico",
      category: "Equipamentos",
      icon: "/sprites/shield_obsidian.png",
      stats: { Defesa: 120, Resistencia: 40 }
    },
    {
      name: "Poção de Vida",
      description: "Restaura instantaneamente uma grande parte da vida do portador.",
      rarity: "Comum",
      category: "Consumíveis",
      icon: "/sprites/potion_health.png",
      stats: { Cura: 500 }
    },
    {
      name: "Anel de Mana",
      description: "Um anel encantado que acelera a regeneração de energia espiritual.",
      rarity: "Raro",
      category: "Acessórios",
      icon: "/sprites/ring_mana.png",
      stats: { Regeneracao: 5 }
    }
  ];

  console.log('Seeding fresh items...');
  for (const itemData of mockItems) {
    const item = await prisma.item.create({ data: itemData });
    console.log(`Created item: ${item.name} (${item.id})`);
    
    // Give item to user
    await prisma.userItem.create({
        data: {
            userId,
            itemId: item.id,
            quantity: 1,
            equipped: false
        }
    });
    console.log(`Granted ${item.name} to ${userId}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
