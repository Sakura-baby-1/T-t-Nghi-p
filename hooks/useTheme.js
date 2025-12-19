import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getPalette, chartConfigForTheme } from '../utils/theme';

function useTheme() {
  const { isDarkMode } = useSettings();
  const palette = useMemo(() => getPalette(!!isDarkMode), [isDarkMode]);
  const chartConfig = useMemo(() => chartConfigForTheme(!!isDarkMode), [isDarkMode]);
  return { isDarkMode: !!isDarkMode, palette, chartConfig };
}

export { useTheme };
export default useTheme;
