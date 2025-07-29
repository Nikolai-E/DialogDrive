export default defineBackground(() => {
  console.log('DialogDrive background script loaded!', { id: browser.runtime.id });

  // Listen for messages from popup
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'IMPROVE_PROMPT') {
      try {
        const result = await browser.storage.sync.get('openai-api-key');
        const apiKey = result['openai-api-key'];
        
        if (!apiKey) {
          sendResponse({ error: 'No API key found' });
          return;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a prompt engineering expert. Improve the given prompt to be more effective, specific, and clear while maintaining its original intent. Return only the improved prompt text without any explanations or formatting.'
              },
              {
                role: 'user',
                content: `Improve this prompt: "${message.promptText}"`
              }
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
          sendResponse({ 
            success: true, 
            improvedText: data.choices[0].message.content.trim() 
          });
        } else {
          sendResponse({ error: 'Invalid response from OpenAI API' });
        }
      } catch (error) {
        console.error('Error improving prompt:', error);
        sendResponse({ error: 'Failed to improve prompt' });
      }
      
      return true; // Keep message channel open for async response
    }
  });
});
