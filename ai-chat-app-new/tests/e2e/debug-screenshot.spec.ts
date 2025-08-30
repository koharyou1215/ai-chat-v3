import { test, expect, Page } from '@playwright/test';

/**
 * Debug test to understand the actual UI structure
 */

test('Take screenshot and analyze UI structure', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Take full page screenshot
  await page.screenshot({ path: 'debug-ui-structure.png', fullPage: true });
  
  // Log all visible elements
  const allElements = await page.locator('*').all();
  console.log(`Found ${allElements.length} elements on page`);
  
  // Look for input elements specifically
  const inputs = page.locator('input, textarea, button');
  const inputCount = await inputs.count();
  console.log(`Found ${inputCount} input elements`);
  
  for (let i = 0; i < Math.min(inputCount, 10); i++) {
    const element = inputs.nth(i);
    const tagName = await element.evaluate(el => el.tagName);
    const type = await element.getAttribute('type') || 'N/A';
    const placeholder = await element.getAttribute('placeholder') || 'N/A';
    const className = await element.getAttribute('class') || 'N/A';
    const id = await element.getAttribute('id') || 'N/A';
    const testId = await element.getAttribute('data-testid') || 'N/A';
    
    console.log(`Element ${i}: ${tagName} - type: ${type}, placeholder: ${placeholder}, class: ${className}, id: ${id}, testid: ${testId}`);
  }
  
  // Look for main containers
  const containers = page.locator('div, section, main');
  const containerCount = await containers.count();
  console.log(`Found ${containerCount} container elements`);
  
  for (let i = 0; i < Math.min(containerCount, 20); i++) {
    const element = containers.nth(i);
    const className = await element.getAttribute('class') || 'N/A';
    const id = await element.getAttribute('id') || 'N/A';
    const testId = await element.getAttribute('data-testid') || 'N/A';
    
    if (className.includes('chat') || className.includes('message') || testId.includes('chat') || testId.includes('message')) {
      console.log(`Chat-related container ${i}: class: ${className}, id: ${id}, testid: ${testId}`);
    }
  }
  
  console.log('Screenshot saved as debug-ui-structure.png');
});