import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { RestringProvider } from '../react/provider';
import { RestringSidebar } from './sidebar';
import { useRestring, useRegisterSection } from '../react/hooks';
import { createMemoryAdapter } from '../adapters/index';

afterEach(cleanup);

function TestApp({
  fields = {},
  sections = [],
  adapter,
  defaultOpen = false,
  position,
}: {
  fields?: Record<string, { defaultValue: string; section?: string; description?: string; richText?: boolean }>;
  sections?: Array<{ id: string; label: string; order?: number }>;
  adapter?: ReturnType<typeof createMemoryAdapter>;
  defaultOpen?: boolean;
  position?: 'left' | 'right';
}) {
  return (
    <RestringProvider enabled adapter={adapter ?? createMemoryAdapter()}>
      <FieldRegisterer fields={fields} sections={sections} />
      <RestringSidebar defaultOpen={defaultOpen} position={position} />
    </RestringProvider>
  );
}

function FieldRegisterer({
  fields,
  sections,
}: {
  fields: Record<string, { defaultValue: string; section?: string; description?: string; richText?: boolean }>;
  sections: Array<{ id: string; label: string; order?: number }>;
}) {
  for (const sec of sections) {
    useRegisterSection(sec);
  }
  return (
    <>
      {Object.entries(fields).map(([path, config]) => (
        <FieldReg key={path} path={path} {...config} />
      ))}
    </>
  );
}

function FieldReg({ path, defaultValue, section, description, richText }: {
  path: string;
  defaultValue: string;
  section?: string;
  description?: string;
  richText?: boolean;
}) {
  useRestring({ path, defaultValue, section, description, richText });
  return null;
}

describe('RestringSidebar', () => {
  it('shows toggle button when closed', () => {
    render(<TestApp />);
    const toggle = screen.getByRole('button', { name: 'Open Restring editor' });
    expect(toggle).toBeTruthy();
  });

  it('opens sidebar when toggle is clicked', () => {
    render(<TestApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Restring editor' }));
    expect(screen.getByRole('complementary', { name: 'Restring string editor' })).toBeTruthy();
  });

  it('renders open by default when defaultOpen=true', () => {
    render(<TestApp defaultOpen={true} />);
    expect(screen.getByRole('complementary', { name: 'Restring string editor' })).toBeTruthy();
  });

  it('closes sidebar when close button is clicked', () => {
    render(<TestApp defaultOpen={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open Restring editor' })).toBeTruthy();
  });

  it('shows fields with their values', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'hero.title': { defaultValue: 'Welcome' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit hero.title' });
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe('Welcome');
  });

  it('filters fields by search', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{
          'hero.title': { defaultValue: 'Welcome' },
          'footer.text': { defaultValue: 'Copyright' },
        }}
      />,
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Search fields' });
    fireEvent.change(searchInput, { target: { value: 'hero' } });
    expect(screen.getByRole('textbox', { name: 'Edit hero.title' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Edit footer.text' })).toBeNull();
  });

  it('filters fields by value content', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{
          'hero.title': { defaultValue: 'Welcome Home' },
          'footer.text': { defaultValue: 'Copyright 2024' },
        }}
      />,
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Search fields' });
    fireEvent.change(searchInput, { target: { value: 'Copyright' } });
    expect(screen.queryByRole('textbox', { name: 'Edit hero.title' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Edit footer.text' })).toBeTruthy();
  });

  it('shows empty state when no fields registered', () => {
    render(<TestApp defaultOpen={true} />);
    expect(screen.getByText('No fields registered.')).toBeTruthy();
  });

  it('shows empty search state', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'a.b': { defaultValue: 'hello' } }}
      />,
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Search fields' });
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });
    expect(screen.getByText('No fields match your search.')).toBeTruthy();
  });

  it('edits a field value', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'edit.field': { defaultValue: 'original' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit edit.field' }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'modified' } });
    expect(textarea.value).toBe('modified');
  });

  it('shows Save button when dirty', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'dirty.field': { defaultValue: 'original' } }}
      />,
    );
    // Save button should not be visible initially
    expect(screen.queryByText('Save')).toBeNull();
    // Make a change
    const textarea = screen.getByRole('textbox', { name: 'Edit dirty.field' }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'changed' } });
    // Save should appear
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('save button calls adapter save', async () => {
    const adapter = createMemoryAdapter();
    const saveSpy = vi.spyOn(adapter, 'save');
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'save.field': { defaultValue: 'original' } }}
        adapter={adapter}
      />,
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Edit save.field' }),
      { target: { value: 'changed' } },
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(saveSpy).toHaveBeenCalled();
  });

  it('reset button clears all overrides', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'reset.field': { defaultValue: 'original' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit reset.field' }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'changed' } });
    expect(textarea.value).toBe('changed');
    fireEvent.click(screen.getByText('Reset'));
    expect(textarea.value).toBe('original');
  });

  it('toggles highlight mode', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'x.y': { defaultValue: 'test' } }}
      />,
    );
    // Default is highlight on
    const btn = screen.getByRole('button', { name: 'Turn off highlights' });
    expect(btn.textContent).toBe('Highlights off');
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Turn on highlights' }).textContent).toBe('Highlights on');
  });

  it('flips sidebar position', () => {
    render(
      <TestApp
        defaultOpen={true}
        position="right"
        fields={{ 'x.y': { defaultValue: 'test' } }}
      />,
    );
    const flipBtn = screen.getByRole('button', { name: 'Move sidebar to left' });
    fireEvent.click(flipBtn);
    expect(screen.getByRole('button', { name: 'Move sidebar to right' })).toBeTruthy();
  });

  it('groups fields by section', () => {
    render(
      <TestApp
        defaultOpen={true}
        sections={[{ id: 'nav', label: 'Navigation' }]}
        fields={{
          'nav.home': { defaultValue: 'Home', section: 'nav' },
          'ungrouped.field': { defaultValue: 'Other' },
        }}
      />,
    );
    expect(screen.getByText('Navigation')).toBeTruthy();
  });

  it('shows eye toggle when highlight mode is on', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'eye.field': { defaultValue: 'test' } }}
      />,
    );
    const eyeBtn = screen.getByRole('button', { name: 'Hide highlight for eye.field' });
    expect(eyeBtn).toBeTruthy();
    fireEvent.click(eyeBtn);
    expect(screen.getByRole('button', { name: 'Show highlight for eye.field' })).toBeTruthy();
  });

  it('shows reset link on individual dirty field', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'ind.field': { defaultValue: 'original' } }}
      />,
    );
    // No reset link initially
    expect(screen.queryByText('reset')).toBeNull();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Edit ind.field' }),
      { target: { value: 'changed' } },
    );
    // Now per-field reset should appear
    const resetBtn = screen.getByText('reset');
    expect(resetBtn).toBeTruthy();
    fireEvent.click(resetBtn);
    expect((screen.getByRole('textbox', { name: 'Edit ind.field' }) as HTMLTextAreaElement).value).toBe('original');
  });

  it('detects RTL text and sets dir attribute', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'rtl.field': { defaultValue: 'مرحبا بالعالم' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit rtl.field' }) as HTMLTextAreaElement;
    expect(textarea.getAttribute('dir')).toBe('rtl');
  });

  it('sets dir=ltr for Latin text', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'ltr.field': { defaultValue: 'Hello World' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit ltr.field' }) as HTMLTextAreaElement;
    expect(textarea.getAttribute('dir')).toBe('ltr');
  });

  it('renders richText fields with HTML label', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'rich.field': { defaultValue: '<b>bold</b>', richText: true } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit rich.field (HTML)' });
    expect(textarea).toBeTruthy();
  });

  it('focus/blur on textarea triggers highlight field', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{ 'focus.field': { defaultValue: 'test' } }}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Edit focus.field' });
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);
    // No crash - highlight set/clear exercised
  });

  it('filters fields by description', () => {
    render(
      <TestApp
        defaultOpen={true}
        fields={{
          'a.field': { defaultValue: 'Hello', description: 'The hero banner title' },
          'b.field': { defaultValue: 'World' },
        }}
      />,
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Search fields' });
    fireEvent.change(searchInput, { target: { value: 'hero banner' } });
    expect(screen.getByRole('textbox', { name: 'Edit a.field' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Edit b.field' })).toBeNull();
  });
});
