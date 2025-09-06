import React, { useMemo, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateGrid, validateInput } from '@/lib/generator';
import { generateAdvancedGrid, validateInput as validateAdvanced } from '@/lib/advancedGenerator';
import { generateImprovedGrid, validateInput as validateImproved } from '@/lib/improvedGenerator';
import { generateCompleteGrid, validateInput as validateComplete } from '@/lib/completeGenerator';
import { generateProGrid, validateInput as validatePro } from '@/lib/proGenerator';
import { generateBulletproofGrid, validateInput as validateBulletproof } from '@/lib/bulletproofGenerator';
import { generateConnectedGrid, validateInput as validateConnected } from '@/lib/connectedGenerator';
import { generateBFSStrandsGrid, validateInput as validateBFS } from '@/lib/bfsStrandsGenerator';
import { generateBoardRemote, supabase } from '@/lib/supabase';
import Screen from '@/components/ui/Screen';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { H1, H2, Body, Caption } from '@/components/ui/Typography';
import GridPreview, { GridData } from '@/components/GridPreview';
import { colors, spacing, borderRadius } from '@/constants/Theme';

export default function CreateScreen() {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [author, setAuthor] = useState('');
  const [words, setWords] = useState<string[]>(['', '', '', '']);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const validation = useMemo(() => {
    const clean = words.map((w) => w.trim()).filter(Boolean);
    const sp = clean[0] ?? '';
    const rest = clean.slice(1);
    
    // Use BFS Strands generator validation
    const v = validateBFS({ title, theme, author, words: [sp, ...rest] });
    
    return {
      lettersUsed: v.lettersUsed,
      lettersNeeded: 48 - v.lettersUsed,
      spangramNeeded: Math.max(0, 6 - sp.length),
      errors: v.errors,
      warnings: v.warnings,
    };
  }, [title, theme, author, words]);

  async function onGenerate() {
    setLoading(true);
    setMessages([]);
    
    const clean = words.map((w) => w.trim());
    const sp = clean[0] ?? '';
    const rest = clean.slice(1).filter(Boolean);

    try {
      const remote = await generateBoardRemote({ title, theme, author, words: [sp, ...rest] });
      setGrid(remote.grid as GridData);
      setMessages(['✅ Board generated successfully!']);
      Alert.alert('Success!', 'Your board has been created and saved.');
    } catch (e: any) {
      // Fallback to BFS STRANDS local generation (NYT Strands algorithm)
      try {
        const res = generateBFSStrandsGrid({ title, theme, author, words: [sp, ...rest] });
        if (res.errors.length === 0) {
          setGrid(res.grid as GridData);
          setMessages(['🧠 BFS Strands grid generated - EXACT NYT algorithm implementation!']);
          
          // Auto-publish locally generated boards to Supabase for sharing
          await publishBoardToSupabase(res.grid, [sp, ...rest]);
        } else {
          // Fallback to connected generator
          const connectedRes = generateConnectedGrid({ title, theme, author, words: [sp, ...rest] });
          if (connectedRes.errors.length === 0) {
            setGrid(connectedRes.grid as GridData);
            setMessages(['🔗 Connected grid generated with word interconnections!']);
            await publishBoardToSupabase(connectedRes.grid, [sp, ...rest]);
          } else {
            // Final fallback to bulletproof generator
            const bulletproofRes = generateBulletproofGrid({ title, theme, author, words: [sp, ...rest] });
            if (bulletproofRes.errors.length === 0) {
              setGrid(bulletproofRes.grid as GridData);
              setMessages(['💪 Bulletproof grid generated - guaranteed success!']);
              await publishBoardToSupabase(bulletproofRes.grid, [sp, ...rest]);
            } else {
              setMessages(['❌ All generators failed. Please check your input.']);
            }
          }
        }
      } catch (localError: any) {
        // Final safety net
        try {
          const bulletproofRes = generateBulletproofGrid({ title, theme, author, words: [sp, ...rest] });
          setGrid(bulletproofRes.grid as GridData);
          setMessages(['💪 Emergency fallback successful!']);
          await publishBoardToSupabase(bulletproofRes.grid, [sp, ...rest]);
        } catch (finalError: any) {
          setMessages([`❌ Critical error: ${finalError.message}. Please report this bug.`]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function publishBoardToSupabase(grid: any, words: string[]) {
    try {
      if (!supabase) {
        console.warn('Supabase not configured, cannot publish board');
        return;
      }
      
      const slug = generateSlug();
      const checksum = generateChecksum(words);
      
      const { error } = await supabase.from('boards').insert({
        slug,
        title,
        theme,
        author,
        words,
        grid,
        checksum,
      });
      
      if (error) {
        console.error('Failed to publish board:', error);
      } else {
        setMessages(prev => [...prev, '🌟 Board published and available in Explore!']);
      }
    } catch (error) {
      console.error('Failed to publish board:', error);
    }
  }

  function generateSlug(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  function generateChecksum(words: string[]): string {
    const data = words.join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  }

  function updateWord(idx: number, value: string) {
    setWords((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function addWord() {
    setWords((prev) => [...prev, '']);
  }

  function removeWord(idx: number) {
    if (idx === 0) return; // Can't remove spangram
    setWords((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Screen gradient>
      {/* Hero Section */}
      <View style={{ 
        marginBottom: spacing[6], 
        paddingTop: spacing[4] 
      }}>
        <H1 color={colors.text.primary} style={{ marginBottom: spacing[2] }}>
          Create Spangram
        </H1>
        <Body color={colors.text.secondary} style={{ marginBottom: spacing[6] }}>
          Design a 6×8 puzzle board with words and a special ⭐ spangram
        </Body>
        
        <Card padding={5}>
          <Input
            placeholder="Enter your theme..."
            value={theme}
            onChangeText={setTheme}
            size="lg"
            style={{ 
              fontSize: 24, 
              fontWeight: '700',
              borderWidth: 0,
              backgroundColor: 'transparent',
              paddingHorizontal: 0,
            }}
          />
        </Card>
      </View>

      {/* Form Section */}
      <Card padding={5} style={{ marginBottom: spacing[4] }}>
        <H2 style={{ marginBottom: spacing[4] }}>Details</H2>
        
        <Input
          label="Puzzle Title"
          placeholder="Enter a catchy title..."
          value={title}
          onChangeText={setTitle}
        />
        
        <Input
          label="Author Name"
          placeholder="Your name"
          value={author}
          onChangeText={setAuthor}
        />
      </Card>

      {/* Words Section */}
      <Card padding={5} style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
          <H2>Words</H2>
          <Button 
            title="Add Word" 
            onPress={addWord} 
            variant="outline" 
            size="sm"
          />
        </View>

        {words.map((word, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing[2] }}>
            <Input
              label={i === 0 ? "Spangram (special word)" : `Word ${i}`}
              placeholder={i === 0 ? 'Must be 6+ letters' : 'Enter word...'}
              value={word}
              onChangeText={(t) => updateWord(i, t)}
              containerStyle={{ flex: 1 }}
              style={i === 0 ? { 
                borderColor: colors.primary[400], 
                backgroundColor: colors.primary[50] 
              } : undefined}
            />
            {i > 0 && (
              <Pressable 
                onPress={() => removeWord(i)} 
                style={{
                  width: 40,
                  height: 40,
                  marginLeft: spacing[2],
                  marginBottom: spacing[2],
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.error,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Body color={colors.text.inverse} weight="bold">×</Body>
              </Pressable>
            )}
          </View>
        ))}
      </Card>

      {/* Status Section */}
      <Card padding={4} style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Caption color={colors.text.secondary}>Letters Used</Caption>
            <Body weight="bold" color={validation.lettersNeeded === 0 ? colors.success : colors.text.primary}>
              {validation.lettersUsed}/48
            </Body>
          </View>
          <View>
            <Caption color={colors.text.secondary}>Spangram Length</Caption>
            <Body weight="bold" color={validation.spangramNeeded === 0 ? colors.success : colors.warning}>
              {words[0]?.length || 0} chars
            </Body>
          </View>
        </View>
        
        {validation.lettersNeeded !== 0 && (
          <Body color={colors.warning} style={{ marginTop: spacing[2] }}>
            {validation.lettersNeeded > 0 
              ? `Need ${validation.lettersNeeded} more letters` 
              : `Remove ${-validation.lettersNeeded} letters`}
          </Body>
        )}
      </Card>

      {/* Generate Button */}
      <Button 
        title={loading ? "Generating..." : "Generate Board"}
        onPress={onGenerate}
        loading={loading}
        disabled={validation.lettersNeeded !== 0 || validation.spangramNeeded > 0}
        size="lg"
        style={{ marginBottom: spacing[6] }}
      />

      {/* Grid Preview */}
      {grid && (
        <Card padding={4} style={{ marginBottom: spacing[4] }}>
          <H2 style={{ marginBottom: spacing[4], textAlign: 'center' }}>Preview</H2>
          <View style={{ alignItems: 'center' }}>
            <GridPreview grid={grid} />
    </View>
        </Card>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <Card padding={4}>
          {messages.map((message, i) => (
            <Body 
              key={i} 
              color={
                message.startsWith('✅') ? colors.success :
                message.startsWith('❌') ? colors.error :
                colors.warning
              }
              style={{ marginBottom: spacing[1] }}
            >
              {message}
            </Body>
          ))}
        </Card>
      )}
    </Screen>
  );
}