import { getUsers, createUser } from './userStore.js';
import { getConfig } from './configStore.js';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'constantindan@gmail.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

export async function seed() {
  await getConfig(); // ensures config.json exists

  const users = await getUsers();
  if (users.length === 0) {
    await createUser({
      name: 'Dan',
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log('---------------------------------------------------------');
    console.log('Created default admin account:');
    console.log(`  email:    ${DEFAULT_ADMIN_EMAIL}`);
    console.log(`  password: ${DEFAULT_ADMIN_PASSWORD}`);
    console.log('Please log in and change this password from the Dashboard.');
    console.log('---------------------------------------------------------');
  }
}
