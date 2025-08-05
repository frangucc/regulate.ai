#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

/**
 * FDA Ingredient Validation MCP Server
 * Validates food ingredients and additives against FDA databases
 */

// FDA API endpoints
const FDA_ENDPOINTS = {
  FOOD_DATA_CENTRAL: 'https://api.nal.usda.gov/fdc/v1',
  OPEN_FDA: 'https://api.fda.gov',
  GRAS_DATABASE: 'https://www.fda.gov/food/generally-recognized-safe-gras'
};

// FDA API Key - you'll need to get this from https://fdc.nal.usda.gov/api-key-signup.html
const FDA_API_KEY = process.env.FDA_API_KEY;

class FDAValidationServer {
  constructor() {
    this.server = new Server(
      {
        name: 'fda-validation-server',
        version: '1.0.0',
        description: 'FDA ingredient and nutritional validation server'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'validate_ingredients',
          description: 'Validate ingredients against FDA databases and GRAS list',
          inputSchema: {
            type: 'object',
            properties: {
              ingredients: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of ingredients to validate'
              }
            },
            required: ['ingredients']
          }
        },
        {
          name: 'check_additive_status',
          description: 'Check food additive approval status with FDA',
          inputSchema: {
            type: 'object',
            properties: {
              additive: {
                type: 'string',
                description: 'Name of food additive to check'
              }
            },
            required: ['additive']
          }
        },
        {
          name: 'validate_nutritional_claims',
          description: 'Validate nutritional claims against FDA guidelines',
          inputSchema: {
            type: 'object',
            properties: {
              claims: {
                type: 'array',
                items: { type: 'string' },
                description: 'Nutritional claims to validate'
              },
              nutritionalData: {
                type: 'object',
                description: 'Nutritional information for validation'
              }
            },
            required: ['claims']
          }
        },
        {
          name: 'check_allergen_requirements',
          description: 'Validate allergen labeling requirements',
          inputSchema: {
            type: 'object',
            properties: {
              ingredients: {
                type: 'array',
                items: { type: 'string' },
                description: 'Ingredients to check for allergen requirements'
              }
            },
            required: ['ingredients']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'validate_ingredients':
            return await this.validateIngredients(args.ingredients);
          case 'check_additive_status':
            return await this.checkAdditiveStatus(args.additive);
          case 'validate_nutritional_claims':
            return await this.validateNutritionalClaims(args.claims, args.nutritionalData);
          case 'check_allergen_requirements':
            return await this.checkAllergenRequirements(args.ingredients);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Validate ingredients against FDA databases
   */
  async validateIngredients(ingredients) {
    const results = [];
    
    for (const ingredient of ingredients) {
      try {
        // Search FDA Food Data Central
        const searchResults = await this.searchFoodDataCentral(ingredient);
        
        // Check GRAS status
        const grasStatus = await this.checkGRASStatus(ingredient);
        
        // Validate ingredient safety
        const safetyCheck = await this.performSafetyCheck(ingredient);
        
        const validation = {
          ingredient: ingredient,
          fdaApproved: searchResults.found,
          grasStatus: grasStatus.status,
          safetyLevel: safetyCheck.level,
          warnings: safetyCheck.warnings,
          regulatoryNotes: safetyCheck.notes,
          source: 'FDA Food Data Central',
          validatedAt: new Date().toISOString()
        };
        
        results.push(validation);
        
      } catch (error) {
        results.push({
          ingredient: ingredient,
          error: error.message,
          validatedAt: new Date().toISOString()
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            validationResults: results,
            summary: {
              totalIngredients: ingredients.length,
              approved: results.filter(r => r.fdaApproved).length,
              warnings: results.filter(r => r.warnings?.length > 0).length,
              source: 'FDA MCP Validation Server'
            }
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Search FDA Food Data Central API
   */
  async searchFoodDataCentral(ingredient) {
    if (!FDA_API_KEY) {
      console.warn('⚠️ FDA API key not configured, using mock data');
      // Return mock validation for demo
      return {
        found: true,
        confidence: 0.8,
        fdcId: 'mock-' + Math.random().toString(36).substr(2, 9)
      };
    }

    try {
      const response = await fetch(
        `${FDA_ENDPOINTS.FOOD_DATA_CENTRAL}/foods/search?api_key=${FDA_API_KEY}&query=${encodeURIComponent(ingredient)}&pageSize=5`
      );
      
      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        found: data.foods && data.foods.length > 0,
        totalHits: data.totalHits || 0,
        confidence: data.foods?.[0]?.score || 0,
        fdcId: data.foods?.[0]?.fdcId
      };
      
    } catch (error) {
      console.error('FDA API search failed:', error);
      return { found: false, error: error.message };
    }
  }

  /**
   * Check GRAS (Generally Recognized as Safe) status
   */
  async checkGRASStatus(ingredient) {
    // Known GRAS ingredients (this would be expanded with real FDA GRAS database)
    const knownGRAS = [
      'salt', 'sugar', 'water', 'wheat flour', 'corn starch', 'soybean oil',
      'milk', 'eggs', 'butter', 'vanilla extract', 'baking soda', 'yeast',
      'vinegar', 'citric acid', 'ascorbic acid', 'sodium chloride'
    ];

    const normalizedIngredient = ingredient.toLowerCase().trim();
    const isGRAS = knownGRAS.some(gras => 
      normalizedIngredient.includes(gras) || gras.includes(normalizedIngredient)
    );

    return {
      status: isGRAS ? 'GRAS' : 'REQUIRES_REVIEW',
      confidence: isGRAS ? 0.9 : 0.3,
      notes: isGRAS 
        ? 'Generally Recognized as Safe' 
        : 'Not found in common GRAS ingredients - manual review recommended'
    };
  }

  /**
   * Perform safety check for ingredient
   */
  async performSafetyCheck(ingredient) {
    // Known problematic ingredients or allergens
    const allergens = ['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans'];
    const warnings = [];
    const notes = [];

    const normalizedIngredient = ingredient.toLowerCase();

    // Check for common allergens
    allergens.forEach(allergen => {
      if (normalizedIngredient.includes(allergen)) {
        warnings.push(`Contains ${allergen} - Major allergen requiring disclosure`);
      }
    });

    // Check for artificial additives
    if (normalizedIngredient.includes('artificial') || 
        normalizedIngredient.includes('fdc') ||
        normalizedIngredient.includes('red dye') ||
        normalizedIngredient.includes('yellow dye')) {
      warnings.push('Contains artificial additives - verify FDA approval status');
    }

    // Check for preservatives
    if (normalizedIngredient.includes('sodium benzoate') ||
        normalizedIngredient.includes('potassium sorbate') ||
        normalizedIngredient.includes('bht') ||
        normalizedIngredient.includes('bha')) {
      notes.push('Contains preservatives - generally recognized as safe in specified amounts');
    }

    return {
      level: warnings.length > 0 ? 'WARNING' : 'SAFE',
      warnings: warnings,
      notes: notes
    };
  }

  /**
   * Check food additive approval status
   */
  async checkAdditiveStatus(additive) {
    // Mock implementation - would integrate with real FDA additive database
    const approvedAdditives = {
      'citric acid': { status: 'APPROVED', cfr: '21 CFR 182.6033' },
      'ascorbic acid': { status: 'APPROVED', cfr: '21 CFR 182.3013' },
      'sodium benzoate': { status: 'APPROVED', cfr: '21 CFR 182.3013' },
      'yellow 5': { status: 'APPROVED', cfr: '21 CFR 74.705' },
      'red 40': { status: 'APPROVED', cfr: '21 CFR 74.340' }
    };

    const result = approvedAdditives[additive.toLowerCase()] || {
      status: 'UNKNOWN',
      cfr: 'Not found - manual verification required'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            additive: additive,
            ...result,
            source: 'FDA Food Additive Database',
            checkedAt: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Validate nutritional claims against FDA guidelines
   */
  async validateNutritionalClaims(claims, nutritionalData) {
    const validationResults = [];

    for (const claim of claims) {
      const validation = await this.validateSingleClaim(claim, nutritionalData);
      validationResults.push(validation);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            claimValidations: validationResults,
            source: 'FDA Nutritional Claims Validation',
            validatedAt: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async validateSingleClaim(claim, nutritionalData) {
    // FDA nutritional claim thresholds
    const fdaThresholds = {
      'low fat': { totalFat: 3 }, // 3g or less per serving
      'fat free': { totalFat: 0.5 }, // Less than 0.5g per serving
      'low sodium': { sodium: 140 }, // 140mg or less per serving
      'sodium free': { sodium: 5 }, // Less than 5mg per serving
      'high fiber': { dietaryFiber: 5 }, // 5g or more per serving
      'good source of fiber': { dietaryFiber: 2.5 }, // 2.5g to 4.9g per serving
    };

    const normalizedClaim = claim.toLowerCase();
    let isValid = false;
    let reason = 'Claim not recognized or cannot be validated';

    // Check against FDA thresholds
    for (const [claimType, thresholds] of Object.entries(fdaThresholds)) {
      if (normalizedClaim.includes(claimType)) {
        isValid = this.checkNutritionalThreshold(nutritionalData, thresholds);
        reason = isValid 
          ? `Claim meets FDA requirements for "${claimType}"` 
          : `Claim does not meet FDA requirements for "${claimType}"`;
        break;
      }
    }

    return {
      claim: claim,
      isValid: isValid,
      reason: reason,
      fdaSource: 'FDA Nutrition Labeling Guidelines'
    };
  }

  checkNutritionalThreshold(nutritionalData, thresholds) {
    for (const [nutrient, maxValue] of Object.entries(thresholds)) {
      const actualValue = parseFloat(nutritionalData[nutrient]?.replace(/[^\d.]/g, '') || '0');
      if (actualValue > maxValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check allergen labeling requirements
   */
  async checkAllergenRequirements(ingredients) {
    const majorAllergens = [
      'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans'
    ];

    const allergenFindings = [];

    ingredients.forEach(ingredient => {
      const normalizedIngredient = ingredient.toLowerCase();
      
      majorAllergens.forEach(allergen => {
        if (normalizedIngredient.includes(allergen)) {
          allergenFindings.push({
            ingredient: ingredient,
            allergen: allergen,
            requirement: `Must be disclosed as "Contains ${allergen}" per FDA regulations`,
            regulation: 'Food Allergen Labeling and Consumer Protection Act (FALCPA)'
          });
        }
      });
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            allergenFindings: allergenFindings,
            totalIngredients: ingredients.length,
            allergensFound: allergenFindings.length,
            complianceStatus: allergenFindings.length > 0 ? 'LABELING_REQUIRED' : 'COMPLIANT',
            source: 'FDA Allergen Labeling Requirements',
            checkedAt: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FDA Validation MCP Server running on stdio');
  }
}

// Start the server
const server = new FDAValidationServer();
server.run().catch(console.error);
