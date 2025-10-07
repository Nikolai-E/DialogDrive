import { Check, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';

type LibraryPrompt = {
  title: string;
  text: string;
  tags?: string[];
  workspace?: string;
};

// Premade library items. For now we mirror the old defaults.
const PREMADE: LibraryPrompt[] = [
  {
    title: 'Summarize this article',
    text: 'Please provide a concise summary of the following article: [paste article here]',
    tags: ['summary', 'article'],
    workspace: 'Research',
  },
  {
    title: 'Code review request',
    text: 'Please review this code for best practices, potential bugs, and suggestions for improvement:\n\n[paste code here]',
    tags: ['code', 'review'],
    workspace: 'Development',
  },
  {
    title: 'Bug report template',
    text: 'Use this structure to write clear, reproducible bug reports.\n\nTitle: [brief summary]\nEnvironment: [OS, browser, app version]\nSteps to Reproduce:\n1) [first step]\n2) [second step]\nExpected: [what should happen]\nActual: [what happens]\nNotes: [logs, screenshots, links]',
    tags: ['qa', 'template'],
    workspace: 'Development',
  },
  {
    title: 'Help Me Write a Better Prompt',
    text: "I want to create a really good prompt for [what I'm trying to do]. Ask me a few questions to understand what I need, then write me a clear prompt I can use with examples of how it works.",
    tags: ['meta', 'learning'],
    workspace: 'Everyday',
  },
  {
    title: 'Explain This Simply',
    text: "Explain [topic/concept] to me like I'm [age or experience level - e.g., '10 years old', 'brand new to this', 'my grandma']. Use simple words, real examples, and maybe a comparison to something I'd know. Keep it short and clear.",
    tags: ['learning'],
    workspace: 'Learning',
  },
  {
    title: 'Sum This Up for Me',
    text: 'Give me the key points from this in [number] bullet points. What\'s the main thing I should know? Content: [paste text, article, or link]',
    tags: ['reading', 'learning'],
    workspace: 'Everyday',
  },
  {
    title: 'Make My Writing Better',
    text: 'Rewrite this to be clearer and easier to read. I\'m writing for [who will read this] and want it to sound [tone - friendly, professional, casual, etc.]. Text: [paste your writing]',
    tags: ['writing'],
    workspace: 'Everyday',
  },
  {
    title: 'Write an Email for Me',
    text: 'Help me write an email to [person] about [what you need]. Context: [quick background]. Tone: [friendly/formal/apologetic/etc.]. What do I want them to do: [action or response you want]',
    tags: ['writing', 'communication'],
    workspace: 'Work',
  },
  {
    title: 'What Should I Watch?',
    text: 'Recommend [number] TV shows or movies for me. I like [genres, shows, or vibes you enjoy]. I\'m in the mood for something [funny/dark/light/thrilling/etc.]. I have [streaming services you have]. Give me a quick reason why each one.',
    tags: ['entertainment'],
    workspace: 'Everyday',
  },
  {
    title: 'Recipe Ideas Based on What I Have',
    text: 'I have these ingredients: [list what\'s in your fridge/pantry]. Suggest [number] recipes I can make. I want something [quick/healthy/comfort food/etc.] for [number] people. Include rough cooking time and difficulty level.',
    tags: ['cooking'],
    workspace: 'Everyday',
  },
  {
    title: 'Social Media Post Ideas',
    text: 'Help me create [number] post ideas for [Instagram/Facebook/TikTok/LinkedIn/etc.] about [topic or what you do/sell/share]. Vibe: [casual/professional/funny/inspiring]. Include caption ideas and what the image/video could show.',
    tags: ['social', 'creative'],
    workspace: 'Creative',
  },
  {
    title: 'Help Me Decide Between Options',
    text: 'I\'m trying to decide between [option A], [option B], and [option C]. What matters to me: [factors like cost, time, quality, etc.]. Help me compare them and suggest what might be best for my situation: [any context]',
    tags: ['decisions'],
    workspace: 'Everyday',
  },
  {
    title: 'Gift Ideas for Someone',
    text: 'I need gift ideas for [person - their age, relationship to you, interests]. Budget: [amount]. Occasion: [birthday/holiday/just because]. They already have [things to avoid]. Give me [number] specific ideas with where to buy them.',
    tags: ['shopping'],
    workspace: 'Everyday',
  },
  {
    title: 'Plan a Day Trip or Outing',
    text: 'Plan a [day trip/weekend] in or around [location]. I\'m going with [who - kids, partner, friends, solo]. We like [activities/interests]. Budget: [range]. Include suggestions for things to do, where to eat, and rough timing.',
    tags: ['travel', 'planning'],
    workspace: 'Everyday',
  },
  {
    title: 'Creative Writing Starter',
    text: 'Give me a creative writing prompt about [genre/theme - sci-fi, romance, mystery, fantasy, etc.]. Include an interesting opening line and a few story hooks to get me started. Make it [exciting/mysterious/heartwarming/funny].',
    tags: ['creative', 'writing', 'fun'],
    workspace: 'Creative',
  },
  {
    title: 'Book Recommendations',
    text: 'Suggest [number] books for me. I recently enjoyed [books or authors you liked]. I\'m interested in [genres or themes]. I prefer [length, style, or vibe - page-turners, literary, funny, etc.]. Brief description of each and why I\'d like it.',
    tags: ['entertainment', 'reading'],
    workspace: 'Everyday',
  },
  {
    title: 'Study Plan for a Topic',
    text: 'I want to learn about [topic]. I\'m [your current level - complete beginner, have some basics, etc.]. Create a simple learning plan with [number] steps or topics to cover, resources I can use, and how long it might take. Goal: [what you want to achieve]',
    tags: ['learning', 'planning'],
    workspace: 'Learning',
  },
  {
    title: 'Workout Plan for My Goals',
    text: 'Create a [number]-week workout plan for me. Current fitness: [beginner/intermediate/advanced]. Goals: [lose weight/build muscle/get stronger/improve cardio]. I have access to [gym equipment/home/bodyweight only]. Time available: [minutes per day, days per week]. Any injuries or limits: [specify]',
    tags: ['fitness', 'planning'],
    workspace: 'Health',
  },
  {
    title: 'Meal Plan for the Week',
    text: 'Make a [number]-day meal plan for [number] people. Dietary needs: [vegetarian/vegan/keto/no restrictions/allergies]. Goals: [healthy/budget-friendly/quick/meal prep]. I don\'t like [foods to avoid]. Include a shopping list.',
    tags: ['cooking', 'planning'],
    workspace: 'Health',
  },
  {
    title: 'Wellness Check-In & Tips',
    text: 'I\'m feeling [stressed/tired/overwhelmed/stuck/etc.] because [brief context]. Give me [number] practical, simple things I can do today or this week to feel better. Keep it realistic and doable.',
    tags: ['wellness'],
    workspace: 'Health',
  },
  {
    title: 'Debug My Code',
    text: 'This [language - Python/JavaScript/SQL/etc.] code isn\'t working right. What it should do: [expected behavior]. What\'s actually happening: [the problem]. Code: [paste your code]. Help me figure out what\'s wrong and how to fix it.',
    tags: ['code'],
    workspace: 'Code',
  },
  {
    title: 'Explain This Code to Me',
    text: 'Explain what this [language] code does in simple terms. I\'m [beginner/intermediate/advanced]. Break it down line by line if it\'s complex. Code: [paste code snippet]. What I\'m confused about: [specific questions if any]',
    tags: ['code', 'learning'],
    workspace: 'Code',
  },
  {
    title: 'Write Code for My Task',
    text: 'Write [language - Python/JavaScript/SQL/etc.] code to [what you need it to do]. Input: [what data you\'re working with]. Output: [what you want to get]. Constraints: [any requirements like libraries to use, performance needs, etc.]. Add comments to explain how it works.',
    tags: ['code'],
    workspace: 'Code',
  },
  {
    title: 'Optimize or Improve My Code',
    text: 'Review this [language] code and suggest improvements for [readability/performance/security/best practices]. Context: [what this code does]. Code: [paste code]. Are there any bugs, edge cases, or better ways to do this?',
    tags: ['code'],
    workspace: 'Code',
  },
  {
    title: 'Meeting Notes to Action Items',
    text: 'Extract action items from these notes—who owns what, when it\'s due, and status. Also give me a 3-5 sentence summary of decisions made. Notes: [paste meeting notes or recording transcript]',
    tags: ['planning', 'communication'],
    workspace: 'Work',
  },
  {
    title: 'Job Application Email or Cover',
    text: 'Help me write a [cover letter/application email] for [job title] at [company]. My background: [brief summary of relevant experience]. Why I\'m interested: [your motivation]. Key skills to highlight: [relevant skills from job posting]. Tone: professional but personable.',
    tags: ['writing', 'communication'],
    workspace: 'Work',
  },
  {
    title: 'Brainstorm Ideas for a Project',
    text: 'I\'m working on [type of project - business, creative, personal]. Goal: [what you\'re trying to achieve]. Current challenge: [what you\'re stuck on]. Give me [number] different ideas or approaches I could try. Think outside the box.',
    tags: ['creative', 'planning'],
    workspace: 'Creative',
  },
  {
    title: 'Birthday or Party Ideas',
    text: 'Help me plan a [type of party] for [person/occasion]. Details: [number] people, ages [age range], budget [amount], location [home/venue/outdoor]. Interests: [themes or things they like]. Give me ideas for activities, food, decorations, and timeline.',
    tags: ['planning', 'fun'],
    workspace: 'Everyday',
  },
];

export const Library: React.FC = () => {
  const { prompts, addPrompt } = useUnifiedStore();
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  const byTitle = useMemo(
    () => new Set(prompts.map((p) => p.title.trim().toLowerCase())),
    [prompts]
  );

  const handleAdd = async (idx: number, p: LibraryPrompt) => {
    if (addingIndex !== null) return;
    setAddingIndex(idx);
    try {
      await addPrompt({
        title: p.title,
        text: p.text,
        workspace: p.workspace || 'General',
        tags: p.tags || [],
        isPinned: false,
        usageCount: 0,
        includeTimestamp: false,
      } as any);
    } finally {
      setAddingIndex(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pt-2 pb-1 border-b bg-background/80 backdrop-blur-sm">
        <h2 className="text-[13px] font-semibold">Prompt Library</h2>
        <p className="text-[11px] text-muted-foreground">
          Curated, ready-to-use prompts you can add to your collection.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {PREMADE.map((p, idx) => {
          const added = byTitle.has(p.title.trim().toLowerCase());
          return (
            <div key={idx} className="rounded-md border border-border bg-card p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[12px] font-medium text-foreground truncate" title={p.title}>
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {p.text}
                  </p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-border bg-[hsl(var(--chip))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--chip-foreground))] tracking-tight shadow-[0_1px_2px_rgba(42,34,28,0.1)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    withIcon
                    onClick={() => handleAdd(idx, p)}
                    disabled={added || addingIndex === idx}
                    aria-pressed={added}
                    aria-label={added ? 'Selected' : `Select ${p.title}`}
                    className={cn(
                      'min-w-[108px] justify-center rounded-full px-3 text-[12px] font-semibold border shadow-[0_2px_8px_rgba(42,34,28,0.16)] transition-colors',
                      added
                        ? 'bg-[hsl(var(--accent))] border-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] disabled:bg-[hsl(var(--accent))] disabled:text-[hsl(var(--accent-foreground))] disabled:opacity-100 disabled:cursor-default'
                        : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                    )}
                  >
                    {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {added ? 'Selected' : addingIndex === idx ? 'Selecting…' : 'Select'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {PREMADE.length === 0 && (
          <div className="text-center text-[12px] text-muted-foreground py-6">
            No library items available.
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
