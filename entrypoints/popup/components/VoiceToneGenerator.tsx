import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ScrollArea } from '../../../components/ui/scroll-area';

interface VoiceToneGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => void;
}

const communicationStyles = {
  professional: 'Maintain a formal, respectful tone. Avoid casual expressions. Focus on clear, credible information.',
  direct: 'Communicate points concisely and assertively. Eliminate filler words.',
  educational: 'Aim to inform or clarify. Use teaching moments by breaking down concepts.',
};

const phrasingPatterns = {
  question_first: 'Start replies by posing a question to engage and frame the discussion.',
  experience_led: 'Ground responses in past learnings or hands-on knowledge.',
  opinion_formula: 'Clearly state personal viewpoints, followed by concise supporting reasoning.',
  listicle_burst: 'Use short, bulleted or numbered lists to break down points.',
};

const writingRules = {
  char_count: 'Never exceed 180 characters.',
  line_breaks: 'Use line breaks frequently to improve readability.',
  emoji_usage: 'Max 1 emoji per reply. Use only to accentuate.',
  no_swearing: 'Do not use any swear words or expletives.',
  no_slang: 'Avoid informal idioms or slang.',
};

export const VoiceToneGenerator: React.FC<VoiceToneGeneratorProps> = ({ open, onOpenChange, onGenerate }) => {
  const [commStyle, setCommStyle] = useState('professional');
  const [phrasing, setPhrasing] = useState('question_first');
  const [rule, setRule] = useState('char_count');

  const handleGenerate = () => {
    const generatedPrompt = `
<COMMUNICATION_STYLE>
- communication type: ${commStyle} — ${communicationStyles[commStyle as keyof typeof communicationStyles]}
</COMMUNICATION_STYLE>

<PHRASING_PATTERNS>
- ${phrasing}: ${phrasingPatterns[phrasing as keyof typeof phrasingPatterns]}
</PHRASING_PATTERNS>

<WRITING_RULES>
- ${rule}: ${writingRules[rule as keyof typeof writingRules]}
</WRITING_RULES>

<EXAMPLES>
1. "Have you considered the downstream risk? In my experience, most teams overlook post-launch monitoring."
2. "Interesting point. Challenges here: 1. Data quality 2. Sync speed 3. User trust"
</EXAMPLES>

<VALIDATION>
- Style is ${commStyle}, direct, and educational.
- All reply guidance measurable.
- No forbidden phrases or greetings.
</VALIDATION>
    `.trim();

    onGenerate(generatedPrompt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice & Tone Prompt Generator</DialogTitle>
          <DialogDescription>
            Select options to generate a structured prompt for defining an AI's voice.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 pr-6">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comm-style">Communication Style</Label>
              <Select value={commStyle} onValueChange={setCommStyle}>
                <SelectTrigger id="comm-style">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(communicationStyles).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phrasing">Phrasing Pattern</Label>
              <Select value={phrasing} onValueChange={setPhrasing}>
                <SelectTrigger id="phrasing">
                  <SelectValue placeholder="Select a pattern" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(phrasingPatterns).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rule">Key Writing Rule</Label>
              <Select value={rule} onValueChange={setRule}>
                <SelectTrigger id="rule">
                  <SelectValue placeholder="Select a rule" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(writingRules).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleGenerate}>
            Generate Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
