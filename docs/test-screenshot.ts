const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:2221/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A2221%2Fcommand-board%2Fdefault');
  await page.getByRole('button', { name: 'Sign in with GitHub' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).click();
  await page.getByRole('main').click();
  await page.getByRole('textbox', { name: 'Username or email address' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).fill('unashamed366@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Username or email address' }).fill('unashamed366@gmail.comrWon22Jo5HvYCa');
  await page.getByRole('textbox', { name: 'Password' }).press('ControlOrMeta+z');
  await page.getByRole('textbox', { name: 'Username or email address' }).fill('unashamed366@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.getByRole('textbox', { name: 'Password' }).fill('rWon22Jo5HvYCa');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('link', { name: 'GitHub Mobile' }).click();
  await page.getByRole('main').click();
  await page.goto('http://localhost:2221/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A2221%2Fcommand-board%2Fdefault&after_sign_in_url=http%3A%2F%2Flocalhost%3A2221%2F&after_sign_up_url=http%3A%2F%2Flocalhost%3A2221%2F#/?after_sign_in_url=http%3A%2F%2Flocalhost%3A2221%2F&after_sign_up_url=http%3A%2F%2Flocalhost%3A2221%2F&redirect_url=http%3A%2F%2Flocalhost%3A2221%2Fcommand-board%2Fdefault');
  await page.getByRole('button', { name: 'Sign in with GitHub' }).click();
  await page.goto('http://localhost:2221/command-board/00000000-0000-0000-0000-000000000000');
  await page.getByText('Unknown ClientCompanyQuick ActionsNoteNew CardNo description?New').click();
  await page.getByRole('img', { name: 'unashamed366@gmail.com' }).click();
  await page.getByText('Unknown ClientCompanyQuick ActionsNoteNew CardNo description?New').click();
  await page.getByText('Unknown ClientCompanyQuick ActionsNoteNew CardNo description?New').click();
  await page.goto('http://localhost:2221/command-board/00000000-0000-0000-0000-000000000000');
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();