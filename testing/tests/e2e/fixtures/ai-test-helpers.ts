/**
 * AI-specific test helpers for autonomous E2E tests.
 */
import { type Page, expect } from '@playwright/test';

export const AI_TIMEOUT = 120_000; // 2 minutes for AI calls
export const MAX_AI_CALLS_PER_FILE = 5;

/**
 * Check if the AI service is available by sending a test message.
 */
export async function isAIAvailable(page: Page): Promise<boolean> {
  try {
    await page.goto('/estimate', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });
    await chatInput.fill('Hello');
    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for any assistant response
    const assistantMessage = page.locator('[data-testid="assistant-message"]');
    await assistantMessage.first().waitFor({ state: 'visible', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a message in the AI chat and wait for the response.
 */
export async function sendAIChatMessage(page: Page, message: string): Promise<string> {
  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.waitFor({ state: 'visible', timeout: 15000 });
  await chatInput.fill(message);

  const sendButton = page.locator('button[aria-label="Send message"]');
  await sendButton.click();

  // Wait for a new assistant message
  await page.waitForTimeout(2000);
  const messages = page.locator('[data-testid="assistant-message"]');
  const count = await messages.count();
  const lastMessage = messages.nth(count - 1);
  await lastMessage.waitFor({ state: 'visible', timeout: 90000 });
  return (await lastMessage.textContent()) || '';
}

/**
 * Verify that an AI response meets quality criteria.
 */
export function verifyAIResponse(
  response: string,
  options: { minLength?: number } = {},
): void {
  const { minLength = 10 } = options;
  expect(response.length).toBeGreaterThanOrEqual(minLength);
}

/**
 * Complete the visualizer wizard up through form selection.
 * Returns when the Generate button is visible.
 */
export async function completeVisualizerWizard(
  page: Page,
  options: { roomType?: string; style?: string } = {},
): Promise<void> {
  const { roomType = 'Kitchen', style = 'Modern' } = options;

  // Upload test image
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-room.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8/5+hnoEIwMgwqpCeCgEAhHkECfYbBBkAAAAASUVORK5CYII=',
      'base64',
    ),
  });

  // Wait for wizard to advance to form step
  await page.waitForTimeout(3000);

  // Select room type
  const roomBtn = page.getByRole('button', { name: new RegExp(roomType, 'i') }).first();
  await roomBtn.waitFor({ state: 'visible', timeout: 10000 });
  await roomBtn.click();
  await page.waitForTimeout(1500);

  // Select style
  const styleBtn = page.getByRole('button', { name: new RegExp(style, 'i') }).first();
  await styleBtn.waitFor({ state: 'visible', timeout: 10000 });
  await styleBtn.click();
  await page.waitForTimeout(1500);
}
