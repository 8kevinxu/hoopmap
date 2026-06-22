// "Plan a run" form: pick a day + time (limited to the court's open-gym days),
// an optional note, and post it. Reuses the same chip pattern as the map's
// time picker, and the shared date helpers in lib/datetime.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createRun, MAX_NOTE } from '../lib/runs';
import { startOfDay, dayChipLabel, fmtClock } from '../lib/datetime';

export default function RunModal({ visible, court, defaultTime, onClose, onCreated }) {
  const days = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);
  // Weekdays this court actually has open-gym basketball — others are disabled.
  const bballDays = useMemo(() => {
    const set = new Set();
    (court?.basketball || []).forEach((blocks, d) => {
      if (blocks && blocks.length) set.add(d);
    });
    return set;
  }, [court]);
  const firstOpenDay = useMemo(
    () => days.find((d) => bballDays.has(d.getDay())) || days[0],
    [days, bballDays]
  );

  // A court's open-gym blocks for a weekday, and the 30-min start slots within
  // them — so a run can only be planned while the gym runs open basketball.
  const blocksFor = (weekday) => court?.basketball?.[weekday] || [];
  const slotsForDay = (dateObj) => {
    if (!dateObj) return [];
    const set = new Set();
    for (const [s, e] of blocksFor(dateObj.getDay())) {
      for (let m = s; m < e; m += 30) set.add(m);
    }
    return [...set].sort((a, b) => a - b);
  };

  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState('friends');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // (Re)initialize the selection each time the sheet opens: prefer the run-time
  // picker's day if it has open gym, else the first open day; snap to a valid slot.
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setNote('');
    setVisibility('friends');
    setBusy(false);
    const dt = defaultTime ? new Date(defaultTime) : null;
    const baseDay = dt && blocksFor(dt.getDay()).length ? startOfDay(dt) : firstOpenDay;
    const slots = slotsForDay(baseDay);
    if (!slots.length) {
      setPicked(null);
      return;
    }
    const wanted = dt ? dt.getHours() * 60 + dt.getMinutes() : null;
    const min = wanted != null && slots.includes(wanted) ? wanted : slots[0];
    const d = new Date(baseDay);
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    setPicked(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selDayTs = picked ? startOfDay(picked).getTime() : null;
  const selMin = picked ? picked.getHours() * 60 + picked.getMinutes() : null;
  const selDay = picked ? startOfDay(picked) : null;
  const daySlots = slotsForDay(selDay);
  const pick = (dayDate, min) => {
    const d = new Date(dayDate);
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    setPicked(d);
  };
  // Switching day snaps the time to a slot that's valid for the new day.
  const pickDay = (d) => {
    const slots = slotsForDay(d);
    if (!slots.length) return;
    const min = selMin != null && slots.includes(selMin) ? selMin : slots[0];
    pick(d, min);
  };

  const submit = async () => {
    if (!picked) {
      setError('Pick a day and time.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createRun({
      courtId: court.id,
      startsAt: picked.toISOString(),
      note,
      visibility,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated?.();
    onClose();
  };

  if (!court) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Plan a run</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.courtName}>{court.name}</Text>

          <Text style={styles.label}>Day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {days.map((d) => {
              const open = bballDays.has(d.getDay());
              const active = d.getTime() === selDayTs;
              return (
                <Pressable
                  key={d.getTime()}
                  disabled={!open}
                  onPress={() => pickDay(d)}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    !open && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                      !open && styles.chipTextDisabled,
                    ]}
                  >
                    {dayChipLabel(d)}
                    {open ? '' : ' · no hoops'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Time</Text>
          {!!selDay && blocksFor(selDay.getDay()).length > 0 && (
            <Text style={styles.hint}>
              Open gym:{' '}
              {blocksFor(selDay.getDay())
                .map(
                  ([s, e]) =>
                    `${fmtClock(Math.floor(s / 60), s % 60)}–${fmtClock(
                      Math.floor(e / 60),
                      e % 60
                    )}`
                )
                .join(', ')}
            </Text>
          )}
          {daySlots.length === 0 ? (
            <Text style={styles.hint}>Pick a day to see open-gym times.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {daySlots.map((m) => {
                const active = m === selMin;
                return (
                  <Pressable
                    key={m}
                    onPress={() => pick(selDay || firstOpenDay, m)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {fmtClock(Math.floor(m / 60), m % 60)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.label}>Who can see it</Text>
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleItem, visibility === 'friends' && styles.toggleActive]}
              onPress={() => setVisibility('friends')}
            >
              <Text
                style={[
                  styles.toggleText,
                  visibility === 'friends' && styles.toggleTextActive,
                ]}
              >
                Friends
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleItem, visibility === 'public' && styles.toggleActive]}
              onPress={() => setVisibility('public')}
            >
              <Text
                style={[
                  styles.toggleText,
                  visibility === 'public' && styles.toggleTextActive,
                ]}
              >
                Anyone
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.note}
            placeholder="Add a note (optional) — e.g. “full court 5s”"
            placeholderTextColor="#9aa7b4"
            value={note}
            onChangeText={setNote}
            maxLength={MAX_NOTE}
            multiline
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submit, busy && styles.submitDisabled]}
            disabled={busy}
            onPress={submit}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Post run</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,42,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0d1b2a' },
  close: { fontSize: 18, color: '#90a0b0' },
  courtName: { fontSize: 14, color: '#5b6b7b', marginTop: 2, marginBottom: 12 },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d1b2a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  hint: { fontSize: 12, color: '#5b6b7b', marginBottom: 8, fontStyle: 'italic' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#eef1f4',
    borderRadius: 10,
    padding: 3,
  },
  toggleItem: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: '#2f74d6' },
  toggleText: { color: '#5b6b7b', fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: '#fff' },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#eef1f4',
  },
  chipActive: { backgroundColor: '#2f74d6' },
  chipDisabled: { backgroundColor: '#f4f6f8', opacity: 0.6 },
  chipText: { color: '#46586a', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  chipTextDisabled: { color: '#aab4bd' },

  note: {
    fontSize: 14,
    color: '#0d1b2a',
    backgroundColor: '#f4f6f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    minHeight: 44,
    maxHeight: 90,
  },
  error: { color: '#c0392b', fontSize: 13, marginTop: 10, fontWeight: '600' },

  submit: {
    backgroundColor: '#1f9d55',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
