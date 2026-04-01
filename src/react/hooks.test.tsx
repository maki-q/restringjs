import { describe, it, expect, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { RestringProvider } from './provider';
import { createMemoryAdapter } from '../adapters/index';
import { useRestring, useRegister, useRegisterSection, useFieldValue, useSnapshot } from './hooks';

afterEach(cleanup);

function Wrapper({ children }: { children: React.ReactNode }) {
  const adapter = createMemoryAdapter();
  return (
    <RestringProvider enabled adapter={adapter}>
      {children}
    </RestringProvider>
  );
}

describe('useRestring', () => {
  it('returns the default value when no override is set', () => {
    let value = '';
    function Test() {
      value = useRestring({ path: 'test.field', defaultValue: 'hello' });
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    expect(value).toBe('hello');
  });

  it('returns the override value when set', () => {
    let value = '';
    let setOverride: (path: string, val: string) => void;
    function Test() {
      const snapshot = useSnapshot();
      value = useRestring({ path: 'test.field', defaultValue: 'hello' });
      // Access setOverride from context indirectly
      return null;
    }
    // Use useRegister to get setter
    function TestWithSetter() {
      const [val, setter] = useRegister({ path: 'over.field', defaultValue: 'original' });
      value = val;
      setOverride = (_p, v) => setter(v);
      return null;
    }
    render(<Wrapper><TestWithSetter /></Wrapper>);
    expect(value).toBe('original');
    act(() => setOverride!('over.field', 'changed'));
    expect(value).toBe('changed');
  });

  it('unregisters the field on unmount', () => {
    let snapshot: ReturnType<typeof useSnapshot> | undefined;
    function SnapshotReader() {
      snapshot = useSnapshot();
      return null;
    }
    function Field() {
      useRestring({ path: 'unmount.field', defaultValue: 'val' });
      return null;
    }
    function App({ show }: { show: boolean }) {
      return (
        <Wrapper>
          {show && <Field />}
          <SnapshotReader />
        </Wrapper>
      );
    }
    const { rerender } = render(<App show={true} />);
    expect(snapshot!.fields.has('unmount.field')).toBe(true);
    rerender(<App show={false} />);
    expect(snapshot!.fields.has('unmount.field')).toBe(false);
  });
});

describe('useRegister', () => {
  it('returns value and setter pair', () => {
    let result: [string, (v: string) => void] = ['', () => {}];
    function Test() {
      result = useRegister({ path: 'reg.field', defaultValue: 'default' });
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    expect(result[0]).toBe('default');
    act(() => result[1]('updated'));
    expect(result[0]).toBe('updated');
  });

  it('registers field with section', () => {
    let snap: ReturnType<typeof useSnapshot> | undefined;
    function Test() {
      useRegister({ path: 'sec.field', defaultValue: 'val', section: 'mysection' });
      snap = useSnapshot();
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    const config = snap!.fields.get('sec.field');
    expect(config?.section).toBe('mysection');
  });
});

describe('useRegisterSection', () => {
  it('registers a section in the store', () => {
    let snap: ReturnType<typeof useSnapshot> | undefined;
    function Test() {
      useRegisterSection({ id: 'my-section', label: 'My Section', order: 1 });
      snap = useSnapshot();
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    expect(snap!.sections.has('my-section')).toBe(true);
    expect(snap!.sections.get('my-section')?.label).toBe('My Section');
  });

  it('unregisters section on unmount', () => {
    let snap: ReturnType<typeof useSnapshot> | undefined;
    function Section() {
      useRegisterSection({ id: 'temp-section', label: 'Temp' });
      return null;
    }
    function Reader() {
      snap = useSnapshot();
      return null;
    }
    function App({ show }: { show: boolean }) {
      return (
        <Wrapper>
          {show && <Section />}
          <Reader />
        </Wrapper>
      );
    }
    const { rerender } = render(<App show={true} />);
    expect(snap!.sections.has('temp-section')).toBe(true);
    rerender(<App show={false} />);
    expect(snap!.sections.has('temp-section')).toBe(false);
  });
});

describe('useFieldValue', () => {
  it('returns the current value of a registered field', () => {
    let fieldVal = '';
    function Registerer() {
      useRestring({ path: 'fv.field', defaultValue: 'hello world' });
      return null;
    }
    function Reader() {
      fieldVal = useFieldValue('fv.field');
      return null;
    }
    render(
      <Wrapper>
        <Registerer />
        <Reader />
      </Wrapper>,
    );
    expect(fieldVal).toBe('hello world');
  });

  it('returns empty string for unregistered field', () => {
    let fieldVal = 'not-empty';
    function Reader() {
      fieldVal = useFieldValue('nonexistent.path');
      return null;
    }
    render(<Wrapper><Reader /></Wrapper>);
    expect(fieldVal).toBe('');
  });

  it('updates when the field value changes', () => {
    let fieldVal = '';
    let setter: (v: string) => void;
    function Registerer() {
      const [, s] = useRegister({ path: 'reactive.field', defaultValue: 'initial' });
      setter = s;
      return null;
    }
    function Reader() {
      fieldVal = useFieldValue('reactive.field');
      return null;
    }
    render(
      <Wrapper>
        <Registerer />
        <Reader />
      </Wrapper>,
    );
    expect(fieldVal).toBe('initial');
    act(() => setter!('changed'));
    expect(fieldVal).toBe('changed');
  });
});

describe('useSnapshot', () => {
  it('returns a full store snapshot', () => {
    let snap: ReturnType<typeof useSnapshot> | undefined;
    function Test() {
      useRestring({ path: 'snap.field', defaultValue: 'val' });
      snap = useSnapshot();
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    expect(snap).toBeDefined();
    expect(snap!.fields).toBeInstanceOf(Map);
    expect(snap!.sections).toBeInstanceOf(Map);
    expect(typeof snap!.overrides).toBe('object');
    expect(snap!.dirty).toBeInstanceOf(Set);
    expect(snap!.fields.has('snap.field')).toBe(true);
  });

  it('reflects dirty state after override', () => {
    let snap: ReturnType<typeof useSnapshot> | undefined;
    let setter: (v: string) => void;
    function Test() {
      const [, s] = useRegister({ path: 'dirty.field', defaultValue: 'clean' });
      setter = s;
      snap = useSnapshot();
      return null;
    }
    render(<Wrapper><Test /></Wrapper>);
    expect(snap!.dirty.has('dirty.field')).toBe(false);
    act(() => setter!('dirtied'));
    expect(snap!.dirty.has('dirty.field')).toBe(true);
  });
});

describe('context error', () => {
  it('throws when used outside RestringProvider', () => {
    function Bad() {
      useRestring({ path: 'x', defaultValue: 'y' });
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useRestringContext must be used within a <RestringProvider>');
  });
});
