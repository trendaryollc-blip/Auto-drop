// ============================================================================
// TESTS: core.js — HuntDrop Core Foundation
// ============================================================================
// Tests all 8 core systems: EventBus, PluginRegistry, ComponentRegistry,
// Config, DataLayer, UI, FeatureFlags, Router
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCore } from './setup.js';

describe('core.js — HuntDrop Core Foundation', () => {
  let HuntDrop;

  beforeEach(() => {
    HuntDrop = loadCore();
  });

  describe('Global Export', () => {
    it('should expose window.HuntDrop', () => {
      expect(window.HuntDrop).toBeDefined();
      expect(HuntDrop).toBe(window.HuntDrop);
    });

    it('should expose all 8 core systems', () => {
      expect(HuntDrop.EventBus).toBeDefined();
      expect(HuntDrop.PluginRegistry).toBeDefined();
      expect(HuntDrop.ComponentRegistry).toBeDefined();
      expect(HuntDrop.Config).toBeDefined();
      expect(HuntDrop.DataLayer).toBeDefined();
      expect(HuntDrop.UI).toBeDefined();
      expect(HuntDrop.FeatureFlags).toBeDefined();
      expect(HuntDrop.Router).toBeDefined();
    });
  });

  // ===========================================================================
  // 1. EVENT BUS
  // ===========================================================================
  describe('EventBus', () => {
    it('should register and emit events', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('test:event', cb);
      await HuntDrop.EventBus.emit('test:event', { data: 'hello' });
      expect(cb).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should return unsubscribe function from on()', async () => {
      const cb = vi.fn();
      const unsub = HuntDrop.EventBus.on('test:event', cb);
      expect(typeof unsub).toBe('function');
      unsub();
      await HuntDrop.EventBus.emit('test:event', { data: 'hello' });
      expect(cb).not.toHaveBeenCalled();
    });

    it('should call listeners in priority order (high to low)', async () => {
      const order = [];
      HuntDrop.EventBus.on('test:priority', () => order.push('low'), { priority: 0 });
      HuntDrop.EventBus.on('test:priority', () => order.push('high'), { priority: 10 });
      HuntDrop.EventBus.on('test:priority', () => order.push('mid'), { priority: 5 });
      await HuntDrop.EventBus.emit('test:priority');
      expect(order).toEqual(['high', 'mid', 'low']);
    });

    it('should support once() — listener fires only once', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.once('test:once', cb);
      await HuntDrop.EventBus.emit('test:once', { a: 1 });
      await HuntDrop.EventBus.emit('test:once', { a: 2 });
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ a: 1 });
    });

    it('should support wildcard event matching', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('product:*', cb);
      await HuntDrop.EventBus.emit('product:updated', { id: 7 });
      expect(cb).toHaveBeenCalledWith({ id: 7 });
    });

    it('should remove specific listener with off()', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      HuntDrop.EventBus.on('test:off', cb1);
      HuntDrop.EventBus.on('test:off', cb2);
      HuntDrop.EventBus.off('test:off', cb1);
      await HuntDrop.EventBus.emit('test:off');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('should remove all listeners with off() when no callback given', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      HuntDrop.EventBus.on('test:offall', cb1);
      HuntDrop.EventBus.on('test:offall', cb2);
      HuntDrop.EventBus.off('test:offall');
      await HuntDrop.EventBus.emit('test:offall');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });

    it('should execute listeners without collecting return values', async () => {
      const spy1 = vi.fn(() => 1);
      const spy2 = vi.fn(() => 2);
      HuntDrop.EventBus.on('test:returns', spy1);
      HuntDrop.EventBus.on('test:returns', spy2);
      await HuntDrop.EventBus.emit('test:returns');
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('should catch errors in listeners and continue', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cb = vi.fn();
      HuntDrop.EventBus.on('test:err', () => { throw new Error('boom'); });
      HuntDrop.EventBus.on('test:err', cb);
      await HuntDrop.EventBus.emit('test:err');
      expect(errSpy).toHaveBeenCalled();
      expect(cb).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('should support context option', async () => {
      const ctx = { value: 42 };
      let receivedCtx;
      HuntDrop.EventBus.on('test:ctx', function() { receivedCtx = this; }, { context: ctx });
      await HuntDrop.EventBus.emit('test:ctx');
      expect(receivedCtx).toBe(ctx);
    });

    it('has() should report if event has listeners', () => {
      expect(HuntDrop.EventBus.has('test:has')).toBe(false);
      HuntDrop.EventBus.on('test:has', () => {});
      expect(HuntDrop.EventBus.has('test:has')).toBe(true);
    });

    it('events() should list all event names', () => {
      HuntDrop.EventBus.on('evt:a', () => {});
      HuntDrop.EventBus.on('evt:b', () => {});
      const events = HuntDrop.EventBus.events();
      expect(events).toContain('evt:a');
      expect(events).toContain('evt:b');
    });

    it('clear() should remove all events', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('test:clear', cb);
      HuntDrop.EventBus.clear();
      await HuntDrop.EventBus.emit('test:clear');
      expect(cb).not.toHaveBeenCalled();
    });

    it('should handle async listeners', async () => {
      const cb = vi.fn().mockResolvedValue('async-result');
      HuntDrop.EventBus.on('test:async', cb);
      await HuntDrop.EventBus.emit('test:async');
      expect(cb).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. PLUGIN REGISTRY
  // ===========================================================================
  describe('PluginRegistry', () => {
    it('should register a plugin', () => {
      const plugin = { name: 'Test Plugin', init: vi.fn(), mount: vi.fn() };
      const result = HuntDrop.PluginRegistry.register('test-plugin', plugin);
      expect(result).toBe(true);
      const registered = HuntDrop.PluginRegistry.get('test-plugin');
      expect(registered).toBeDefined();
      expect(registered.id).toBe('test-plugin');
      expect(registered.name).toBe('Test Plugin');
      expect(registered.version).toBe('1.0.0'); // default
    });

    it('should set default values for missing plugin properties', () => {
      HuntDrop.PluginRegistry.register('minimal-plugin', {});
      const p = HuntDrop.PluginRegistry.get('minimal-plugin');
      expect(p.version).toBe('1.0.0');
      expect(p.description).toBe('');
      expect(p.author).toBe('unknown');
      expect(p.dependencies).toEqual([]);
      expect(p.routes).toEqual([]);
      expect(p.components).toEqual({});
      expect(p.hooks).toEqual({});
      expect(p.config).toEqual({});
      expect(typeof p.init).toBe('function');
      expect(typeof p.mount).toBe('function');
      expect(typeof p.unmount).toBe('function');
      expect(typeof p.destroy).toBe('function');
      expect(p._mounted).toBe(false);
      expect(p._initialized).toBe(false);
    });

    it('should fail registration if dependency is missing', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const plugin = { dependencies: ['nonexistent'] };
      const result = HuntDrop.PluginRegistry.register('dep-plugin', plugin);
      expect(result).toBe(false);
      expect(HuntDrop.PluginRegistry.get('dep-plugin')).toBeUndefined();
      errSpy.mockRestore();
    });

    it('should succeed registration if dependency exists', () => {
      HuntDrop.PluginRegistry.register('base-plugin', {});
      const plugin = { dependencies: ['base-plugin'] };
      const result = HuntDrop.PluginRegistry.register('dependent-plugin', plugin);
      expect(result).toBe(true);
    });

    it('should register hooks from plugin definition', () => {
      const hookFn = vi.fn();
      HuntDrop.PluginRegistry.register('hook-plugin', { hooks: { 'custom:hook': hookFn } });
      // Hook should be registered internally
      // We can verify by executing the hook
      return HuntDrop.PluginRegistry.executeHook('custom:hook', { data: 1 }).then((result) => {
        expect(hookFn).toHaveBeenCalled();
      });
    });

    it('should init a plugin and mark it as initialized', async () => {
      const initFn = vi.fn();
      HuntDrop.PluginRegistry.register('init-plugin', { init: initFn });
      await HuntDrop.PluginRegistry.init('init-plugin');
      expect(initFn).toHaveBeenCalled();
      expect(HuntDrop.PluginRegistry.get('init-plugin')._initialized).toBe(true);
    });

    it('should not re-init an already initialized plugin', async () => {
      const initFn = vi.fn();
      HuntDrop.PluginRegistry.register('init-once-plugin', { init: initFn });
      await HuntDrop.PluginRegistry.init('init-once-plugin');
      await HuntDrop.PluginRegistry.init('init-once-plugin');
      expect(initFn).toHaveBeenCalledTimes(1);
    });

    it('should mount a plugin and mark it as mounted', async () => {
      const mountFn = vi.fn();
      HuntDrop.PluginRegistry.register('mount-plugin', { mount: mountFn });
      await HuntDrop.PluginRegistry.mount('mount-plugin');
      expect(mountFn).toHaveBeenCalled();
      expect(HuntDrop.PluginRegistry.get('mount-plugin')._mounted).toBe(true);
    });

    it('should rollback partial DOM from a failed mount', async () => {
      const mountFn = vi.fn(() => {
        const el = document.createElement('div');
        el.id = 'rollback-plugin';
        document.body.appendChild(el);
        throw new Error('boom');
      });
      HuntDrop.PluginRegistry.register('rollback-plugin', { mount: mountFn });
      await HuntDrop.PluginRegistry.mount('rollback-plugin');
      expect(document.getElementById('rollback-plugin')).toBeNull();
      expect(HuntDrop.PluginRegistry.get('rollback-plugin')._mounted).toBe(false);
    });

    it('should not re-mount an already mounted plugin', async () => {
      const mountFn = vi.fn();
      HuntDrop.PluginRegistry.register('mount-once-plugin', { mount: mountFn });
      await HuntDrop.PluginRegistry.mount('mount-once-plugin');
      await HuntDrop.PluginRegistry.mount('mount-once-plugin');
      expect(mountFn).toHaveBeenCalledTimes(1);
    });

    it('should unmount a plugin', async () => {
      const unmountFn = vi.fn();
      HuntDrop.PluginRegistry.register('unmount-plugin', { unmount: unmountFn });
      await HuntDrop.PluginRegistry.mount('unmount-plugin');
      await HuntDrop.PluginRegistry.unmount('unmount-plugin');
      expect(unmountFn).toHaveBeenCalled();
      expect(HuntDrop.PluginRegistry.get('unmount-plugin')._mounted).toBe(false);
    });

    it('should not unmount a non-mounted plugin', async () => {
      const unmountFn = vi.fn();
      HuntDrop.PluginRegistry.register('no-unmount-plugin', { unmount: unmountFn });
      await HuntDrop.PluginRegistry.unmount('no-unmount-plugin');
      expect(unmountFn).not.toHaveBeenCalled();
    });

    it('should destroy a plugin (unmount + delete)', async () => {
      const destroyFn = vi.fn();
      HuntDrop.PluginRegistry.register('destroy-plugin', { destroy: destroyFn });
      await HuntDrop.PluginRegistry.mount('destroy-plugin');
      await HuntDrop.PluginRegistry.destroy('destroy-plugin');
      expect(destroyFn).toHaveBeenCalled();
      expect(HuntDrop.PluginRegistry.get('destroy-plugin')).toBeUndefined();
    });

    it('should catch init errors and not mark as initialized', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      HuntDrop.PluginRegistry.register('init-err-plugin', {
        init: () => { throw new Error('init failed'); }
      });
      await HuntDrop.PluginRegistry.init('init-err-plugin');
      expect(HuntDrop.PluginRegistry.get('init-err-plugin')._initialized).toBe(false);
      errSpy.mockRestore();
    });

    it('should catch mount errors and not mark as mounted', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      HuntDrop.PluginRegistry.register('mount-err-plugin', {
        mount: () => { throw new Error('mount failed'); }
      });
      await HuntDrop.PluginRegistry.mount('mount-err-plugin');
      expect(HuntDrop.PluginRegistry.get('mount-err-plugin')._mounted).toBe(false);
      errSpy.mockRestore();
    });

    it('getAll() should return all registered plugins', () => {
      HuntDrop.PluginRegistry.register('plugin-a', {});
      HuntDrop.PluginRegistry.register('plugin-b', {});
      const all = HuntDrop.PluginRegistry.getAll();
      const ids = all.map((p) => p.id);
      expect(ids).toContain('plugin-a');
      expect(ids).toContain('plugin-b');
    });

    it('addHook() and executeHook() should work together', async () => {
      const hookFn = vi.fn((data) => ({ ...data, modified: true }));
      HuntDrop.PluginRegistry.addHook('test:hook', 'some-plugin', hookFn);
      const result = await HuntDrop.PluginRegistry.executeHook('test:hook', { value: 1 });
      expect(hookFn).toHaveBeenCalledWith({ value: 1 });
      expect(result).toEqual({ value: 1, modified: true });
    });

    it('executeHook() should pass modified data through chain', async () => {
      HuntDrop.PluginRegistry.addHook('chain:hook', 'p1', (data) => ({ ...data, step1: true }));
      HuntDrop.PluginRegistry.addHook('chain:hook', 'p2', (data) => ({ ...data, step2: true }));
      const result = await HuntDrop.PluginRegistry.executeHook('chain:hook', {});
      expect(result).toEqual({ step1: true, step2: true });
    });

    it('executeHook() should catch handler errors', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      HuntDrop.PluginRegistry.addHook('err:hook', 'p1', () => { throw new Error('hook err'); });
      const result = await HuntDrop.PluginRegistry.executeHook('err:hook', { data: 1 });
      expect(result).toEqual({ data: 1 });
      errSpy.mockRestore();
    });

    it('should pass context object to init/mount/unmount/destroy', async () => {
      let receivedCtx;
      HuntDrop.PluginRegistry.register('ctx-plugin', {
        init: (ctx) => { receivedCtx = ctx; }
      });
      await HuntDrop.PluginRegistry.init('ctx-plugin');
      expect(receivedCtx).toBeDefined();
      expect(receivedCtx.EventBus).toBeDefined();
      expect(receivedCtx.PluginRegistry).toBeDefined();
      expect(receivedCtx.Config).toBeDefined();
      expect(receivedCtx.DataLayer).toBeDefined();
      expect(receivedCtx.UI).toBeDefined();
    });
  });

  // ===========================================================================
  // 3. COMPONENT REGISTRY
  // ===========================================================================
  describe('ComponentRegistry', () => {
    it('should register a component type', () => {
      HuntDrop.ComponentRegistry.register('test-comp', {
        render: (props) => `<div>${props.text}</div>`,
        mount: vi.fn(),
        unmount: vi.fn(),
        defaultProps: { text: 'default' },
        validate: () => true,
      });
      expect(HuntDrop.ComponentRegistry.types()).toContain('test-comp');
    });

    it('should set defaults for missing component definition properties', () => {
      HuntDrop.ComponentRegistry.register('minimal-comp', {});
      const inst = HuntDrop.ComponentRegistry.create('minimal-comp', {}, null);
      expect(inst).toBeDefined();
      expect(inst.id).toBeDefined();
      expect(inst.type).toBe('minimal-comp');
    });

    it('should create a component instance with merged props', () => {
      HuntDrop.ComponentRegistry.register('props-comp', {
        defaultProps: { a: 1, b: 2 },
        validate: () => true,
        render: (props) => `<div>${props.a}-${props.b}</div>`,
      });
      const inst = HuntDrop.ComponentRegistry.create('props-comp', { b: 99 }, null);
      expect(inst.props.a).toBe(1); // default
      expect(inst.props.b).toBe(99); // overridden
    });

    it('should return null for unknown component type', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const inst = HuntDrop.ComponentRegistry.create('nonexistent', {}, null);
      expect(inst).toBeNull();
      errSpy.mockRestore();
    });

    it('should return null when validation fails', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      HuntDrop.ComponentRegistry.register('invalid-comp', {
        validate: () => false,
      });
      const inst = HuntDrop.ComponentRegistry.create('invalid-comp', {}, null);
      expect(inst).toBeNull();
      errSpy.mockRestore();
    });

    it('should render and mount into a container', () => {
      const mountFn = vi.fn();
      HuntDrop.ComponentRegistry.register('render-comp', {
        render: (props) => `<div class="content">${props.text}</div>`,
        mount: mountFn,
        defaultProps: { text: 'hello' },
        validate: () => true,
      });
      const container = document.createElement('div');
      const inst = HuntDrop.ComponentRegistry.create('render-comp', {}, container);
      expect(container.innerHTML).toContain('hello');
      expect(mountFn).toHaveBeenCalled();
      expect(inst._mounted).toBe(true);
    });

    it('should update a component with new props', () => {
      const unmountFn = vi.fn();
      const mountFn = vi.fn();
      HuntDrop.ComponentRegistry.register('update-comp', {
        render: (props) => `<div>${props.text}</div>`,
        mount: mountFn,
        unmount: unmountFn,
        defaultProps: { text: 'old' },
        validate: () => true,
      });
      const container = document.createElement('div');
      const inst = HuntDrop.ComponentRegistry.create('update-comp', {}, container);
      HuntDrop.ComponentRegistry.update(inst.id, { text: 'new' });
      expect(container.innerHTML).toContain('new');
      expect(unmountFn).toHaveBeenCalled();
    });

    it('should preserve focus while updating simple components', () => {
      HuntDrop.ComponentRegistry.register('focus-comp', {
        render: (props) => `<div><input value="${props.value}" /></div>`,
        mount: vi.fn(),
        unmount: vi.fn(),
        validate: () => true,
        defaultProps: { value: 'old' },
      });
      const container = document.createElement('div');
      document.body.appendChild(container);
      const inst = HuntDrop.ComponentRegistry.create('focus-comp', { value: 'old' }, container);
      const input = container.querySelector('input');
      input.focus();
      HuntDrop.ComponentRegistry.update(inst.id, { value: 'new' });
      const updatedInput = container.querySelector('input');
      expect(updatedInput).toBeDefined();
      expect(document.activeElement).toBe(updatedInput);
      expect(updatedInput.value).toBe('new');
    });

    it('should destroy a component', () => {
      const unmountFn = vi.fn();
      HuntDrop.ComponentRegistry.register('destroy-comp', {
        render: () => '<div></div>',
        mount: vi.fn(),
        unmount: unmountFn,
        validate: () => true,
      });
      const container = document.createElement('div');
      const inst = HuntDrop.ComponentRegistry.create('destroy-comp', {}, container);
      HuntDrop.ComponentRegistry.destroy(inst.id);
      // Should not throw — instance is removed
      expect(unmountFn).toHaveBeenCalled();
    });

    it('types() should return all registered types', () => {
      HuntDrop.ComponentRegistry.register('type-a', {});
      HuntDrop.ComponentRegistry.register('type-b', {});
      const types = HuntDrop.ComponentRegistry.types();
      expect(types).toContain('type-a');
      expect(types).toContain('type-b');
    });

    it('should generate unique IDs for instances', () => {
      HuntDrop.ComponentRegistry.register('uid-comp', { validate: () => true });
      const inst1 = HuntDrop.ComponentRegistry.create('uid-comp', {}, null);
      const inst2 = HuntDrop.ComponentRegistry.create('uid-comp', {}, null);
      expect(inst1.id).not.toBe(inst2.id);
    });
  });

  // ===========================================================================
  // 4. CONFIG MANAGER
  // ===========================================================================
  describe('Config', () => {
    it('should set defaults', () => {
      HuntDrop.Config.defaults('test', { a: 1, b: 2 });
      expect(HuntDrop.Config.get('test.a')).toBe(1);
      expect(HuntDrop.Config.get('test.b')).toBe(2);
    });

    it('should merge defaults with existing', () => {
      HuntDrop.Config.defaults('merge', { a: 1 });
      HuntDrop.Config.defaults('merge', { b: 2 });
      expect(HuntDrop.Config.get('merge.a')).toBe(1);
      expect(HuntDrop.Config.get('merge.b')).toBe(2);
    });

    it('should get value by dot path', () => {
      HuntDrop.Config.defaults('nested', { level1: { level2: { value: 42 } } });
      expect(HuntDrop.Config.get('nested.level1.level2.value')).toBe(42);
    });

    it('should return fallback for missing path', () => {
      expect(HuntDrop.Config.get('nonexistent.path', 'fallback')).toBe('fallback');
    });

    it('should return fallback for null intermediate', () => {
      HuntDrop.Config.defaults('nulltest', { a: null });
      expect(HuntDrop.Config.get('nulltest.a.b', 'fb')).toBe('fb');
    });

    it('should set value by dot path', () => {
      HuntDrop.Config.defaults('settest', { a: { b: 1 } });
      const result = HuntDrop.Config.set('settest.a.b', 99);
      expect(result).toBe(true);
      expect(HuntDrop.Config.get('settest.a.b')).toBe(99);
    });

    it('should create intermediate objects when setting', () => {
      HuntDrop.Config.defaults('createtest', {});
      HuntDrop.Config.set('createtest.x.y.z', 'value');
      expect(HuntDrop.Config.get('createtest.x.y.z')).toBe('value');
    });

    it('should emit config:changed event on set', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('config:changed', cb);
      HuntDrop.Config.defaults('emit', { a: 1 });
      HuntDrop.Config.set('emit.a', 2);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({
        path: 'emit.a',
        value: 2,
        oldValue: 1,
        namespace: 'emit',
      }));
    });

    it('should support validators', () => {
      HuntDrop.Config.defaults('valid', { age: 0 });
      HuntDrop.Config.validate('valid.age', (v) => v >= 0);
      expect(HuntDrop.Config.set('valid.age', 5)).toBe(true);
      expect(HuntDrop.Config.set('valid.age', -1)).toBe(false);
      expect(HuntDrop.Config.get('valid.age')).toBe(5); // unchanged
    });

    it('should validate values against registered schemas', () => {
      HuntDrop.Config.registerSchema('plugin.alpha', {
        enabled: { type: 'boolean' },
        threshold: { type: 'number' },
      });
      expect(HuntDrop.Config.set('plugin.alpha.enabled', true)).toBe(true);
      expect(HuntDrop.Config.set('plugin.alpha.enabled', 'yes')).toBe(false);
      expect(HuntDrop.Config.set('plugin.alpha.threshold', 3)).toBe(true);
      expect(HuntDrop.Config.set('plugin.alpha.threshold', '3')).toBe(false);
    });

    it('getAll() should return all config', () => {
      HuntDrop.Config.defaults('all1', { x: 1 });
      const all = HuntDrop.Config.getAll();
      expect(all.all1).toEqual({ x: 1 });
    });

    it('getAll(ns) should return specific namespace', () => {
      HuntDrop.Config.defaults('ns1', { x: 1 });
      HuntDrop.Config.defaults('ns2', { y: 2 });
      expect(HuntDrop.Config.getAll('ns1')).toEqual({ x: 1 });
    });

    it('watch() should call callback on path changes', async () => {
      HuntDrop.Config.defaults('watch', { a: 1 });
      const cb = vi.fn();
      HuntDrop.Config.watch('watch.a', cb);
      HuntDrop.Config.set('watch.a', 2);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({
        path: 'watch.a',
        value: 2,
      }));
    });

    it('watch() should match child paths', async () => {
      HuntDrop.Config.defaults('watchchild', { parent: { child: 1 } });
      const cb = vi.fn();
      HuntDrop.Config.watch('watchchild.parent', cb);
      HuntDrop.Config.set('watchchild.parent.child', 2);
      expect(cb).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 5. DATA LAYER
  // ===========================================================================
  describe('DataLayer', () => {
    it('should register an adapter', () => {
      HuntDrop.DataLayer.registerAdapter('test-platform', {
        search: async () => [],
        getProduct: async () => null,
      });
      const adapter = HuntDrop.DataLayer.getAdapter('test-platform');
      expect(adapter).toBeDefined();
      expect(typeof adapter.search).toBe('function');
    });

    it('should set default methods for missing adapter methods', () => {
      HuntDrop.DataLayer.registerAdapter('minimal-adapter', {});
      const adapter = HuntDrop.DataLayer.getAdapter('minimal-adapter');
      expect(typeof adapter.search).toBe('function');
      expect(typeof adapter.getProduct).toBe('function');
      expect(typeof adapter.getTrends).toBe('function');
      expect(typeof adapter.getSuppliers).toBe('function');
      expect(typeof adapter.getPrices).toBe('function');
    });

    it('getAdapter() should return undefined for unknown platform', () => {
      expect(HuntDrop.DataLayer.getAdapter('nonexistent')).toBeUndefined();
    });

    it('getAdapters() should return all adapters as entries', () => {
      HuntDrop.DataLayer.registerAdapter('plat-a', {});
      HuntDrop.DataLayer.registerAdapter('plat-b', {});
      const adapters = HuntDrop.DataLayer.getAdapters();
      const names = adapters.map(([name]) => name);
      expect(names).toContain('plat-a');
      expect(names).toContain('plat-b');
    });

    it('searchAll() should aggregate results from all adapters', async () => {
      HuntDrop.DataLayer.registerAdapter('search-a', {
        search: async () => [{ id: 1, title: 'A' }],
      });
      HuntDrop.DataLayer.registerAdapter('search-b', {
        search: async () => [{ id: 2, title: 'B' }],
      });
      const results = await HuntDrop.DataLayer.searchAll('query');
      expect(results.length).toBe(2);
      expect(results[0]._sourcePlatform).toBeDefined();
    });

    it('searchAll() should filter by platform', async () => {
      HuntDrop.DataLayer.registerAdapter('filter-a', {
        search: async () => [{ id: 1 }],
      });
      HuntDrop.DataLayer.registerAdapter('filter-b', {
        search: async () => [{ id: 2 }],
      });
      const results = await HuntDrop.DataLayer.searchAll('query', { platform: 'filter-a' });
      expect(results.length).toBe(1);
      expect(results[0]._sourcePlatform).toBe('filter-a');
    });

    it('searchAll() should catch adapter errors', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      HuntDrop.DataLayer.registerAdapter('err-adapter', {
        search: async () => { throw new Error('search failed'); },
      });
      const results = await HuntDrop.DataLayer.searchAll('query');
      expect(results).toEqual([]);
      errSpy.mockRestore();
    });

    it('getFromPlatform() should call specific adapter method', async () => {
      const getProduct = vi.fn().mockResolvedValue({ id: 1, title: 'Test' });
      HuntDrop.DataLayer.registerAdapter('gfp', { getProduct });
      const result = await HuntDrop.DataLayer.getFromPlatform('gfp', 'getProduct', 1);
      expect(getProduct).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, title: 'Test' });
    });

    it('getFromPlatform() should return null for unknown platform', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await HuntDrop.DataLayer.getFromPlatform('unknown', 'search');
      expect(result).toBeNull();
      errSpy.mockRestore();
    });

    it('should cache values with TTL', () => {
      HuntDrop.DataLayer.setCache('key1', 'value1', 100000);
      expect(HuntDrop.DataLayer.getCache('key1')).toBe('value1');
    });

    it('should return null for expired cache', () => {
      HuntDrop.DataLayer.setCache('expired', 'val', -1); // already expired
      expect(HuntDrop.DataLayer.getCache('expired')).toBeNull();
    });

    it('should return null for missing cache key', () => {
      expect(HuntDrop.DataLayer.getCache('nonexistent')).toBeNull();
    });

    it('clearCache() should clear all cache', () => {
      HuntDrop.DataLayer.setCache('ck1', 'v1');
      HuntDrop.DataLayer.clearCache();
      expect(HuntDrop.DataLayer.getCache('ck1')).toBeNull();
    });
  });

  // ===========================================================================
  // 6. UI UTILITIES
  // ===========================================================================
  describe('UI', () => {
    it('$(id) should get element by ID', () => {
      const el = document.createElement('div');
      el.id = 'ui-test';
      document.body.appendChild(el);
      expect(HuntDrop.UI.$('ui-test')).toBe(el);
      el.remove();
    });

    it('$$(sel) should query selector all', () => {
      document.body.innerHTML = '<div class="q1"></div><div class="q1"></div>';
      const els = HuntDrop.UI.$$('.q1');
      expect(els.length).toBe(2);
    });

    it('create() should create element with attributes', () => {
      const el = HuntDrop.UI.create('div', { className: 'test-cls', id: 'created' });
      expect(el.tagName).toBe('DIV');
      expect(el.className).toBe('test-cls');
      expect(el.id).toBe('created');
    });

    it('create() should set innerHTML', () => {
      const el = HuntDrop.UI.create('div', { innerHTML: '<span>hello</span>' });
      expect(el.innerHTML).toBe('<span>hello</span>');
    });

    it('create() should set textContent', () => {
      const el = HuntDrop.UI.create('p', { textContent: 'hello text' });
      expect(el.textContent).toBe('hello text');
    });

    it('create() should attach event listeners via on* attributes', () => {
      const handler = vi.fn();
      const el = HuntDrop.UI.create('button', { onClick: handler });
      el.click();
      expect(handler).toHaveBeenCalled();
    });

    it('create() should apply style object', () => {
      const el = HuntDrop.UI.create('div', { style: { color: 'red', fontSize: '14px' } });
      expect(el.style.color).toBe('red');
      expect(el.style.fontSize).toBe('14px');
    });

    it('create() should set arbitrary attributes', () => {
      const el = HuntDrop.UI.create('a', { href: 'https://example.com', target: '_blank' });
      expect(el.getAttribute('href')).toBe('https://example.com');
      expect(el.getAttribute('target')).toBe('_blank');
    });

    it('create() should append string children', () => {
      const el = HuntDrop.UI.create('div', {}, ['hello', 'world']);
      expect(el.textContent).toBe('helloworld');
    });

    it('create() should append element children', () => {
      const child = document.createElement('span');
      const el = HuntDrop.UI.create('div', {}, [child]);
      expect(el.children[0]).toBe(child);
    });

    it('on() should add event listener to element', () => {
      const el = document.createElement('button');
      el.id = 'on-test';
      document.body.appendChild(el);
      const handler = vi.fn();
      HuntDrop.UI.on('on-test', 'click', handler);
      el.click();
      expect(handler).toHaveBeenCalled();
      el.remove();
    });

    it('off() should remove event listener', () => {
      const el = document.createElement('button');
      el.id = 'off-test';
      document.body.appendChild(el);
      const handler = vi.fn();
      HuntDrop.UI.on('off-test', 'click', handler);
      HuntDrop.UI.off('off-test', 'click', handler);
      el.click();
      expect(handler).not.toHaveBeenCalled();
      el.remove();
    });

    it('toast() should create a toast container and message', () => {
      HuntDrop.UI.toast('Test message', 'info', 100);
      const container = document.querySelector('.hd-toast-container');
      expect(container).toBeDefined();
      const toast = document.querySelector('.hd-toast');
      expect(toast).toBeDefined();
    });

    it('modal() should show modal with content', async () => {
      await HuntDrop.UI.modal('<p>Modal content</p>');
      const overlay = document.querySelector('.hd-modal-overlay');
      expect(overlay).toBeDefined();
      expect(overlay.style.opacity).toBe('1');
    });

    it('closeModal() should hide modal', async () => {
      await HuntDrop.UI.modal('<p>Test</p>');
      HuntDrop.UI.closeModal();
      const overlay = document.querySelector('.hd-modal-overlay');
      expect(overlay.style.opacity).toBe('0');
    });

    it('escapeHtml() should escape HTML special characters', () => {
      const result = HuntDrop.UI.escapeHtml('<script>alert("x")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('script');
      expect(result).toContain('alert');
    });

    it('escapeHtml() should handle null/undefined', () => {
      expect(HuntDrop.UI.escapeHtml(null)).toBe('');
      expect(HuntDrop.UI.escapeHtml(undefined)).toBe('');
    });

    it('escapeHtml() should convert numbers to strings', () => {
      expect(HuntDrop.UI.escapeHtml(123)).toBe('123');
    });
  });

  // ===========================================================================
  // 7. FEATURE FLAGS
  // ===========================================================================
  describe('FeatureFlags', () => {
    it('should register a flag with default value', () => {
      HuntDrop.FeatureFlags.register('test-flag', false);
      expect(HuntDrop.FeatureFlags.isEnabled('test-flag')).toBe(false);
    });

    it('should register a flag with true default', () => {
      HuntDrop.FeatureFlags.register('true-flag', true);
      expect(HuntDrop.FeatureFlags.isEnabled('true-flag')).toBe(true);
    });

    it('enable() should set flag to true', () => {
      HuntDrop.FeatureFlags.register('enable-flag', false);
      HuntDrop.FeatureFlags.enable('enable-flag');
      expect(HuntDrop.FeatureFlags.isEnabled('enable-flag')).toBe(true);
    });

    it('disable() should set flag to false', () => {
      HuntDrop.FeatureFlags.register('disable-flag', true);
      HuntDrop.FeatureFlags.disable('disable-flag');
      expect(HuntDrop.FeatureFlags.isEnabled('disable-flag')).toBe(false);
    });

    it('enable() should emit feature:enabled event', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('feature:enabled', cb);
      HuntDrop.FeatureFlags.register('emit-flag', false);
      HuntDrop.FeatureFlags.enable('emit-flag');
      expect(cb).toHaveBeenCalledWith({ flag: 'emit-flag' });
    });

    it('disable() should emit feature:disabled event', async () => {
      const cb = vi.fn();
      HuntDrop.EventBus.on('feature:disabled', cb);
      HuntDrop.FeatureFlags.register('emit-flag2', true);
      HuntDrop.FeatureFlags.disable('emit-flag2');
      expect(cb).toHaveBeenCalledWith({ flag: 'emit-flag2' });
    });

    it('isEnabled() should return false for unregistered flags', () => {
      expect(HuntDrop.FeatureFlags.isEnabled('unregistered')).toBe(false);
    });

    it('getAll() should return copy of all flags', () => {
      HuntDrop.FeatureFlags.register('all-flag1', true);
      HuntDrop.FeatureFlags.register('all-flag2', false);
      const all = HuntDrop.FeatureFlags.getAll();
      expect(all['all-flag1']).toBe(true);
      expect(all['all-flag2']).toBe(false);
    });
  });

  // ===========================================================================
  // 8. ROUTER
  // ===========================================================================
  describe('Router', () => {
    it('should register a route', () => {
      HuntDrop.Router.register('/test', vi.fn());
      // No direct getter, but navigate should work
      expect(true).toBe(true);
    });

    it('should navigate to registered route', async () => {
      const handler = vi.fn();
      HuntDrop.Router.register('/nav', handler);
      await HuntDrop.Router.navigate('/nav');
      expect(handler).toHaveBeenCalled();
      expect(HuntDrop.Router.current()).toBe('/nav');
    });

    it('should emit route:leave when leaving a route', async () => {
      const leaveCb = vi.fn();
      HuntDrop.EventBus.on('route:leave', leaveCb);
      HuntDrop.Router.register('/from', vi.fn());
      HuntDrop.Router.register('/to', vi.fn());
      await HuntDrop.Router.navigate('/from');
      await HuntDrop.Router.navigate('/to');
      expect(leaveCb).toHaveBeenCalledWith({ path: '/from' });
    });

    it('should emit route:enter when entering a route', async () => {
      const enterCb = vi.fn();
      HuntDrop.EventBus.on('route:enter', enterCb);
      HuntDrop.Router.register('/enter', vi.fn());
      await HuntDrop.Router.navigate('/enter');
      expect(enterCb).toHaveBeenCalledWith({ path: '/enter' });
    });

    it('should warn for unregistered routes', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await HuntDrop.Router.navigate('/nonexistent');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('current() should return null initially', () => {
      // Fresh core
      const fresh = loadCore();
      expect(fresh.Router.current()).toBeNull();
    });
  });
});