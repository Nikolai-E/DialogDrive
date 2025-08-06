import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';

interface VoiceToneGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => void;
}

const COMMUNICATION_STYLES = {
  professional: {
    label: 'Professional',
    description: 'Formal, respectful tone for industry peers',
    template: 'Maintain a formal, respectful tone. Avoid casual expressions. Focus on clear, credible information exchange.'
  },
  direct: {
    label: 'Direct',
    description: 'Concise and assertive communication',
    template: 'Communicate points concisely and assertively. Eliminate filler words. Address disagreements plainly.'
  },
  educational: {
    label: 'Educational',
    description: 'Informative and clarifying',
    template: 'Aim to inform or clarify. Use teaching moments by breaking down concepts or sharing insights.'
  },
  casual: {
    label: 'Casual',
    description: 'Friendly and conversational',
    template: 'Use a friendly, approachable tone. Include conversational elements while maintaining clarity.'
  },
  technical: {
    label: 'Technical',
    description: 'Precise and detailed for experts',
    template: 'Use precise technical language. Include specific details and assume domain expertise.'
  }
};

const PHRASING_PATTERNS = {
  question_first: {
    label: 'Question First',
    description: 'Start with engaging questions',
    example: 'Have you considered...?'
  },
  experience_led: {
    label: 'Experience Led',
    description: 'Ground responses in past learnings',
    example: 'From my experience...'
  },
  opinion_formula: {
    label: 'Opinion Formula',
    description: 'State viewpoint with reasoning',
    example: 'In my view... because...'
  },
  listicle_burst: {
    label: 'List Format',
    description: 'Use numbered or bulleted lists',
    example: 'Key points: 1. ... 2. ...'
  },
  step_by_step: {
    label: 'Step by Step',
    description: 'Outline processes explicitly',
    example: 'Step 1: ... Step 2: ...'
  },
  storytelling: {
    label: 'Storytelling',
    description: 'Use narrative and examples',
    example: 'Let me share a story...'
  }
};

const WRITING_CONSTRAINTS = {
  length: [
    { value: 'twitter', label: 'Twitter (280 chars)', chars: 280 },
    { value: 'linkedin', label: 'LinkedIn (short)', chars: 500 },
    { value: 'medium', label: 'Medium length', chars: 1000 },
    { value: 'long', label: 'Long form', chars: null }
  ],
  formality: [
    { value: 'very_formal', label: 'Very Formal' },
    { value: 'formal', label: 'Formal' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'casual', label: 'Casual' },
    { value: 'very_casual', label: 'Very Casual' }
  ],
  expertise: [
    { value: 'beginner', label: 'Beginner friendly' },
    { value: 'intermediate', label: 'Some knowledge assumed' },
    { value: 'expert', label: 'Expert level' }
  ]
};

export const VoiceToneGenerator: React.FC<VoiceToneGeneratorProps> = ({
  open,
  onOpenChange,
  onGenerate
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({
    purpose: '',
    styles: [] as string[],
    patterns: [] as string[],
    constraints: {
      maxLength: '',
      formality: 'neutral',
      expertise: 'intermediate',
      emoji: false,
      lineBreaks: true,
      examples: true
    },
    expertise: {
      domain: '',
      years: ''
    }
  });

  const steps = [
    { title: 'Purpose', description: 'What will this voice be used for?' },
    { title: 'Communication Style', description: 'Select one or more styles' },
    { title: 'Phrasing Patterns', description: 'How should responses be structured?' },
    { title: 'Constraints', description: 'Set boundaries and rules' },
    { title: 'Expertise', description: 'Define the expert persona' }
  ];

  const handleGenerate = () => {
    let prompt = '';

    // Add purpose if specified
    if (selections.purpose) {
      prompt += `You are an AI assistant designed to ${selections.purpose}.\n\n`;
    }

    // Add expertise if specified
    if (selections.expertise.domain) {
      prompt += `You are an expert in ${selections.expertise.domain}`;
      if (selections.expertise.years) {
        prompt += ` with ${selections.expertise.years} years of experience`;
      }
      prompt += '.\n\n';
    }

    // Add communication styles
    if (selections.styles.length > 0) {
      prompt += '<COMMUNICATION_STYLE>\n';
      selections.styles.forEach(style => {
        const styleData = COMMUNICATION_STYLES[style as keyof typeof COMMUNICATION_STYLES];
        prompt += `- ${styleData.label}: ${styleData.template}\n`;
      });
      prompt += '</COMMUNICATION_STYLE>\n\n';
    }

    // Add phrasing patterns
    if (selections.patterns.length > 0) {
      prompt += '<PHRASING_PATTERNS>\n';
      selections.patterns.forEach(pattern => {
        const patternData = PHRASING_PATTERNS[pattern as keyof typeof PHRASING_PATTERNS];
        prompt += `- ${patternData.label}: ${patternData.description}. Example: "${patternData.example}"\n`;
      });
      prompt += '</PHRASING_PATTERNS>\n\n';
    }

    // Add constraints
    prompt += '<WRITING_RULES>\n';
    if (selections.constraints.maxLength) {
      const lengthData = WRITING_CONSTRAINTS.length.find(l => l.value === selections.constraints.maxLength);
      if (lengthData?.chars) {
        prompt += `- Maximum length: ${lengthData.chars} characters\n`;
      }
    }
    prompt += `- Formality level: ${selections.constraints.formality}\n`;
    prompt += `- Target audience expertise: ${selections.constraints.expertise}\n`;
    if (selections.constraints.emoji) {
      prompt += '- Emoji usage: Use sparingly to enhance tone (max 1 per response)\n';
    } else {
      prompt += '- Emoji usage: Do not use emojis\n';
    }
    if (selections.constraints.lineBreaks) {
      prompt += '- Formatting: Use line breaks for readability\n';
    }
    if (selections.constraints.examples) {
      prompt += '- Include examples when explaining concepts\n';
    }
    prompt += '</WRITING_RULES>\n';

    onGenerate(prompt);
    onOpenChange(false);
    // Reset for next use
    setCurrentStep(0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Purpose
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What's the main purpose of this voice?</Label>
              <textarea
                className="w-full h-24 p-2 border rounded-md text-xs"
                placeholder="e.g., 'help users write engaging LinkedIn comments' or 'provide technical documentation'"
                value={selections.purpose}
                onChange={(e) => setSelections({...selections, purpose: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick templates:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelections({...selections, purpose: 'write professional emails'})}
                >
                  Email Writer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelections({...selections, purpose: 'create engaging social media content'})}
                >
                  Social Media
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelections({...selections, purpose: 'provide technical documentation and explanations'})}
                >
                  Technical Docs
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelections({...selections, purpose: 'assist with creative writing and storytelling'})}
                >
                  Creative Writing
                </Button>
              </div>
            </div>
          </div>
        );

      case 1: // Communication Style
        return (
          <div className="space-y-3">
            {Object.entries(COMMUNICATION_STYLES).map(([key, style]) => (
              <label key={key} className="flex items-start space-x-2 cursor-pointer">
                <Checkbox
                  checked={selections.styles.includes(key)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelections({...selections, styles: [...selections.styles, key]});
                    } else {
                      setSelections({...selections, styles: selections.styles.filter(s => s !== key)});
                    }
                  }}
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.description}</div>
                </div>
              </label>
            ))}
          </div>
        );

      case 2: // Phrasing Patterns
        return (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(PHRASING_PATTERNS).map(([key, pattern]) => (
              <label key={key} className="flex items-start space-x-2 cursor-pointer">
                <Checkbox
                  checked={selections.patterns.includes(key)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelections({...selections, patterns: [...selections.patterns, key]});
                    } else {
                      setSelections({...selections, patterns: selections.patterns.filter(p => p !== key)});
                    }
                  }}
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium">{pattern.label}</div>
                  <div className="text-xs text-muted-foreground">{pattern.description}</div>
                  <div className="text-xs text-blue-600">{pattern.example}</div>
                </div>
              </label>
            ))}
          </div>
        );

      case 3: // Constraints
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Response Length</Label>
              <Select
                value={selections.constraints.maxLength}
                onValueChange={(value) => setSelections({
                  ...selections,
                  constraints: {...selections.constraints, maxLength: value}
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length constraint" />
                </SelectTrigger>
                <SelectContent>
                  {WRITING_CONSTRAINTS.length.map(length => (
                    <SelectItem key={length.value} value={length.value}>
                      {length.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Rules</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={selections.constraints.emoji}
                    onCheckedChange={(checked) => setSelections({
                      ...selections,
                      constraints: {...selections.constraints, emoji: !!checked}
                    })}
                  />
                  <span className="text-xs">Allow emojis</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={selections.constraints.lineBreaks}
                    onCheckedChange={(checked) => setSelections({
                      ...selections,
                      constraints: {...selections.constraints, lineBreaks: !!checked}
                    })}
                  />
                  <span className="text-xs">Use line breaks for readability</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={selections.constraints.examples}
                    onCheckedChange={(checked) => setSelections({
                      ...selections,
                      constraints: {...selections.constraints, examples: !!checked}
                    })}
                  />
                  <span className="text-xs">Include examples</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 4: // Expertise
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain of Expertise</Label>
              <input
                type="text"
                className="w-full p-2 border rounded-md text-xs"
                placeholder="e.g., 'software engineering', 'marketing', 'data science'"
                value={selections.expertise.domain}
                onChange={(e) => setSelections({
                  ...selections,
                  expertise: {...selections.expertise, domain: e.target.value}
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience (optional)</Label>
              <input
                type="text"
                className="w-full p-2 border rounded-md text-xs"
                placeholder="e.g., '10', '15+', 'extensive'"
                value={selections.expertise.years}
                onChange={(e) => setSelections({
                  ...selections,
                  expertise: {...selections.expertise, years: e.target.value}
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelections({
                  ...selections,
                  expertise: {domain: 'software development', years: '10+'}
                })}
              >
                Software Dev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelections({
                  ...selections,
                  expertise: {domain: 'product management', years: '8'}
                })}
              >
                Product Mgmt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelections({
                  ...selections,
                  expertise: {domain: 'data science and machine learning', years: '12'}
                })}
              >
                Data Science
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelections({
                  ...selections,
                  expertise: {domain: 'digital marketing', years: '7'}
                })}
              >
                Marketing
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Voice & Tone Generator</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </p>
          
          <div className="py-4">
            {renderStepContent()}
          </div>

          <div className="flex justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleGenerate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Generate Prompt
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                setCurrentStep(0);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
