import React, { useState } from 'react';

interface SettingsProps {
  onNameChange?: (name: string) => void;
  onFontSizeChange?: (size: number) => void;
  currentName?: string;
  currentFontSize?: number;
}

const FONT_PRESETS = {
  small: 16,
  medium: 24,
  large: 30,
};

type FontPreset = keyof typeof FONT_PRESETS;


export const Settings: React.FC<SettingsProps> = ({ 
  onNameChange,
  onFontSizeChange,
  currentName = '',
  currentFontSize = 20
}) => {
  const [name, setName] = useState(currentName);
    const [fontSize, setFontSize] = useState(currentFontSize);
    
const handleFontPresetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newSize = Number(e.target.value);
  setFontSize(newSize);
  if (onFontSizeChange) {
    onFontSizeChange(newSize);
  }
};

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (onNameChange) {
      onNameChange(newName);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>
      <div className="settings-content">
        
        {/* Name Setting */}
        <div className="setting-item">
          <label htmlFor="agent-name">Your Name</label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter name"
            className="setting-input"
          />
        </div>

        {/* Font Size Setting */}
        <div className="setting-item">
          <label htmlFor="font-size">
            Size of Text
          </label>
          <div className="font-size-options">
                <label className="font-size-option">
      <input
        type="radio"
        name="fontSize"
        value={FONT_PRESETS.small}
        checked={fontSize === FONT_PRESETS.small}
        onChange={handleFontPresetChange}
      />
      Small
    </label>

    <label className="font-size-option">
      <input
        type="radio"
        name="fontSize"
        value={FONT_PRESETS.medium}
        checked={fontSize === FONT_PRESETS.medium}
        onChange={handleFontPresetChange}
      />
      Medium
    </label>

    <label className="font-size-option">
      <input
        type="radio"
        name="fontSize"
        value={FONT_PRESETS.large}
        checked={fontSize === FONT_PRESETS.large}
        onChange={handleFontPresetChange}
      />
      Large
    </label>

  </div>

        </div>

      </div>
    </div>
  );
};