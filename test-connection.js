#!/usr/bin/env node

// Simple connection test for OpenRouter API
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, 'templates', '.env') 
});


async function testConnection() {
  console.log('🔍 Testing OpenRouter API connection...\n');
  

  // Check API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key found');
    console.log('Set OPENROUTER_API_KEY in your environment or .env file');
    return;
  }
  
  console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
  
  // Test basic request
  try {
    console.log('🌐 Testing basic API connection...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b:free',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/test/open-cli',
          'X-Title': 'open-cli-test'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ API connection successful!');
    console.log('📝 Response:', response.data.choices[0].message.content);
    console.log('💰 Usage:', response.data.usage);
    
  } catch (error) {
    console.error('❌ API connection failed');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      // Specific error handling
      switch (error.response.status) {
        case 401:
          console.log('\n💡 This looks like an authentication error.');
          console.log('   • Check your API key is correct');
          console.log('   • Verify it\'s properly set in your environment');
          break;
        case 402:
          console.log('\n💡 This looks like a billing/credits error.');
          console.log('   • Check your OpenRouter account has credits');
          console.log('   • Visit: https://openrouter.ai/credits');
          break;
        case 400:
          console.log('\n💡 This looks like a request format error.');
          console.log('   • The model name might be invalid');
          break;
        default:
          console.log('\n💡 This is an API error. Check OpenRouter status.');
      }
    } else if (error.request) {
      console.error('❌ Network error - could not reach OpenRouter');
      console.log('💡 Check your internet connection');
    } else {
      console.error('❌ Request setup error:', error.message);
    }
  }
}

// Test models endpoint
async function testModels() {
  console.log('\n🤖 Testing models endpoint...');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 5000
    });
    
    console.log('✅ Models endpoint accessible');
    console.log(`📊 Available models: ${response.data.data.length}`);
    
    // Show a few free models
    const freeModels = response.data.data
      .filter(model => model.pricing.prompt === '0' && model.pricing.completion === '0')
      .slice(0, 3);
    
    if (freeModels.length > 0) {
      console.log('\n🆓 Some free models you can try:');
      freeModels.forEach(model => {
        console.log(`   • ${model.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Models endpoint failed:', error.message);
  }
}

// Run tests
testConnection().then(() => testModels());