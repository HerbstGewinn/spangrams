import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type Cell = { ch: string; isSpangram?: boolean; };

export type GridData = Cell[][]; // 6x8 grid

type Props = {
  grid: GridData | null;
};

export default function GridPreview({ grid }: Props) {
  if (!grid) {
    return (
      <View style={styles.empty}> 
        <Text style={styles.emptyText}>Grid preview will appear here</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#efe8ff", "#ffffff"]} style={styles.grid}> 
      {grid.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((cell, x) => (
            <View key={`${y}-${x}`} style={[styles.cell, cell.isSpangram && styles.starCell]}> 
              <Text style={styles.cellText}>{cell.ch.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ))}
    </LinearGradient>
  );
}

const CELL = 42;

const styles = StyleSheet.create({
  empty: {
    width: CELL * 6,
    height: CELL * 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  emptyText: {
    color: '#888',
  },
  grid: {
    padding: 6,
    borderRadius: 16,
    shadowColor: '#a58cff',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL,
    height: CELL,
    margin: 3,
    borderRadius: CELL / 2,
    backgroundColor: '#eee9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starCell: {
    backgroundColor: '#b39cff',
  },
  cellText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e1a2b',
  },
});


