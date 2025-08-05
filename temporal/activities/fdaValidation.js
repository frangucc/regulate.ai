import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FDA Validation Activity using MCP Server
 * Validates ingredients and nutritional claims against FDA databases
 */

/**
 * Call FDA MCP Server tool
 */
async function callFDAMCPTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const mcpServerPath = path.join(__dirname, '../../mcp-servers/fda-validation/index.js');
    
    const child = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse MCP response
        const lines = stdout.trim().split('\n');
        const jsonResponse = lines[lines.length - 1];
        const result = JSON.parse(jsonResponse);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse MCP response: ${error.message}`));
      }
    });

    // Send MCP request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    child.stdin.write(JSON.stringify(mcpRequest) + '\n');
    child.stdin.end();
  });
}

/**
 * Validate ingredients using FDA MCP server with real FDA API calls
 */
export async function validateIngredientsWithFDA(data) {
  console.log('🔍 Starting FDA ingredient validation...');
  
  try {
    const startTime = Date.now();
    const { ingredients = [], extractedInformation = {} } = data;
    
    console.log('🔍 FDA validation data:', { ingredients, extractedInformation });

    // Extract ingredients from structured data if not provided directly
    let ingredientsToValidate = ingredients;
    if (!ingredientsToValidate.length && extractedInformation.ingredients) {
      ingredientsToValidate = extractedInformation.ingredients;
    }
    
    console.log('🔍 Ingredients to validate:', ingredientsToValidate);

    // Call real FDA MCP server for validation
    console.log('🔍 Calling FDA MCP server for real validation...');
    
    let fdaValidationResult;
    let issues = [];
    let recommendations = [];
    
    try {
      // Call FDA MCP server to validate ingredients
      fdaValidationResult = await callFDAMCPTool('validate_ingredients', {
        ingredients: ingredientsToValidate
      });
      
      console.log('✅ FDA MCP validation result:', JSON.stringify(fdaValidationResult, null, 2));
      
      // Process FDA validation results into issues and recommendations
      if (fdaValidationResult.result && fdaValidationResult.result.content && fdaValidationResult.result.content[0]) {
        const result = fdaValidationResult.result.content[0].text;
        console.log('🔍 Raw FDA result text:', result);
        
        try {
          const parsedResult = JSON.parse(result);
          console.log('📋 Parsed FDA result:', parsedResult);
          
          // Process the parsed result
          processFDAResult(parsedResult);
        } catch (parseError) {
          console.error('❌ FDA JSON parsing error:', parseError);
          console.error('❌ Raw text that failed to parse:', result);
        }
      } else {
        console.log('⚠️ FDA validation result structure invalid:', {
          hasResult: !!fdaValidationResult.result,
          hasContent: !!(fdaValidationResult.result && fdaValidationResult.result.content),
          hasFirstItem: !!(fdaValidationResult.result && fdaValidationResult.result.content && fdaValidationResult.result.content[0])
        });
      }
      
      function processFDAResult(parsedResult) {
        
        // Convert FDA validation results to issues format
        if (parsedResult.validationResults) {
          parsedResult.validationResults.forEach(validationResult => {
            if (!validationResult.fdaApproved) {
              issues.push({
                type: 'FDA_INGREDIENT_NOT_APPROVED',
                severity: 'WARNING',
                message: `Ingredient "${validationResult.ingredient}" not found in FDA approved database`,
                source: 'FDA Food Data Central',
                sourceTag: 'FDA-INGREDIENT',
                ingredient: validationResult.ingredient,
                timestamp: new Date().toISOString()
              });
            }
            
            if (validationResult.warnings && validationResult.warnings.length > 0) {
              validationResult.warnings.forEach(warning => {
                issues.push({
                  type: 'FDA_INGREDIENT_WARNING',
                  severity: 'WARNING',
                  message: warning,
                  source: 'FDA Food Data Central',
                  sourceTag: 'FDA-INGREDIENT',
                  ingredient: validationResult.ingredient,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            if (!validationResult.grasStatus) {
              recommendations.push({
                type: 'FDA_GRAS_RECOMMENDATION',
                severity: 'INFO',
                message: `Verify GRAS (Generally Recognized as Safe) status for "${validationResult.ingredient}"`,
                source: 'FDA MCP Server',
                sourceTag: 'FDA-GRAS',
                ingredient: validationResult.ingredient,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
        
        // Add summary information as recommendations
        if (parsedResult.summary) {
          recommendations.push({
            type: 'FDA_VALIDATION_SUMMARY',
            severity: 'INFO',
            message: `FDA validation completed: ${parsedResult.summary.approved}/${parsedResult.summary.totalIngredients} ingredients approved, ${parsedResult.summary.warnings} warnings found`,
            source: 'FDA MCP Server',
            sourceTag: 'FDA-INGREDIENT',
            timestamp: new Date().toISOString()
          });
        }
      } // End processFDAResult function
      
    } catch (error) {
      console.error('❌ FDA MCP server call failed:', error);
      
      // Fallback to informative error issue
      issues = [{
        type: 'FDA_SERVICE_ERROR',
        severity: 'WARNING',
        message: 'FDA validation service temporarily unavailable - manual review recommended',
        source: 'FDA MCP Server',
        sourceTag: 'FDA-INGREDIENT',
        timestamp: new Date().toISOString()
      }];
    }
    
    // Add default issue if no ingredients to validate
    if (ingredientsToValidate.length === 0) {
      issues.push({
        type: 'FDA_NO_INGREDIENTS',
        severity: 'WARNING',
        message: 'No ingredients detected - manual ingredient list review recommended',
        source: 'FDA Ingredient Database',
        sourceTag: 'FDA-INGREDIENT',
        timestamp: new Date().toISOString()
      });
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log('📊 FDA Validation Final Results:');
    console.log('  - Issues created:', issues.length, issues);
    console.log('  - Recommendations created:', recommendations.length, recommendations);
    
    return {
      success: true,
      fdaValidation: {
        ingredientsValidated: ingredientsToValidate.length,
        issues: issues,
        recommendations: recommendations,
        summary: {
          totalIssues: issues.length,
          complianceIssues: issues.filter(i => i.severity === 'COMPLIANCE').length,
          warnings: issues.filter(i => i.severity === 'WARNING').length,
          recommendations: recommendations.length,
          ingredientsValidated: ingredientsToValidate.length,
          message: fdaValidationResult ? 'FDA validation completed with real FDA API data' : 'FDA validation completed with fallback data'
        },
        processingTime: processingTime,
        validatedAt: new Date().toISOString(),
        source: 'FDA MCP Validation Server (Live API)',
        fdaApiResult: fdaValidationResult
      }
    };

  } catch (error) {
    console.error('❌ FDA validation failed:', error.message);

    return {
      success: false,
      error: error.message,
      fdaValidation: {
        issues: [{
          type: 'FDA_VALIDATION_ERROR',
          severity: 'ERROR',
          message: `FDA validation failed: ${error.message}`,
          source: 'FDA MCP Server',
          sourceTag: 'FDA-ERROR',
          timestamp: new Date().toISOString()
        }],
        recommendations: [{
          type: 'FDA_RETRY',
          severity: 'INFO',
          message: 'Retry FDA validation or perform manual regulatory review',
          source: 'FDA MCP Server',
          sourceTag: 'FDA-RETRY',
          timestamp: new Date().toISOString()
        }]
      }
    };
  }
}

/**
 * Validate nutritional claims using FDA MCP server
 */
export async function validateNutritionalClaimsWithFDA(data) {
  console.log('📊 Starting FDA nutritional claims validation...');
  
  try {
    const startTime = Date.now();
    const { claims = [], nutritionalInfo = {} } = data;

    if (!claims.length) {
      console.log('⚠️ No nutritional claims found to validate');
      return {
        success: true,
        fdaClaimsValidation: {
          claimsValidated: 0,
          issues: [],
          recommendations: [{
            type: 'FDA_NO_CLAIMS',
            severity: 'INFO',
            message: 'No nutritional claims detected - no FDA validation required',
            source: 'FDA Claims Validation',
            sourceTag: 'FDA-CLAIMS',
            timestamp: new Date().toISOString()
          }]
        }
      };
    }

    // Call FDA MCP server for claims validation
    const claimsValidation = await callFDAMCPTool('validate_nutritional_claims', {
      claims: claims,
      nutritionalData: nutritionalInfo
    });

    const processingTime = Date.now() - startTime;
    const issues = [];
    const recommendations = [];

    // Process claims validation results
    if (claimsValidation.content?.[0]?.text) {
      const validationData = JSON.parse(claimsValidation.content[0].text);
      
      validationData.claimValidations?.forEach(validation => {
        if (!validation.isValid) {
          issues.push({
            type: 'FDA_INVALID_CLAIM',
            severity: 'COMPLIANCE',
            claim: validation.claim,
            message: validation.reason,
            source: validation.fdaSource || 'FDA Nutrition Labeling Guidelines',
            sourceTag: 'FDA-CLAIMS',
            timestamp: new Date().toISOString()
          });
        } else {
          recommendations.push({
            type: 'FDA_VALID_CLAIM',
            severity: 'INFO',
            claim: validation.claim,
            message: validation.reason,
            source: validation.fdaSource || 'FDA Nutrition Labeling Guidelines',
            sourceTag: 'FDA-CLAIMS',
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    console.log(`✅ FDA claims validation completed in ${processingTime}ms`);

    return {
      success: true,
      fdaClaimsValidation: {
        claimsValidated: claims.length,
        issues: issues,
        recommendations: recommendations,
        processingTime: processingTime,
        validatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ FDA claims validation failed:', error.message);

    return {
      success: false,
      error: error.message,
      fdaClaimsValidation: {
        issues: [{
          type: 'FDA_CLAIMS_ERROR',
          severity: 'ERROR',
          message: `FDA claims validation failed: ${error.message}`,
          source: 'FDA MCP Server',
          sourceTag: 'FDA-ERROR',
          timestamp: new Date().toISOString()
        }]
      }
    };
  }
}

/**
 * Check food additive status using FDA MCP server
 */
export async function checkFoodAdditiveStatus(additive) {
  console.log(`🧪 Checking FDA additive status for: ${additive}`);
  
  try {
    const startTime = Date.now();

    const additiveCheck = await callFDAMCPTool('check_additive_status', {
      additive: additive
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ FDA additive check completed in ${processingTime}ms`);

    return {
      success: true,
      additiveValidation: {
        additive: additive,
        status: additiveCheck.status || 'UNKNOWN',
        cfr: additiveCheck.cfr,
        processingTime: processingTime,
        checkedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ FDA additive check failed:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}
