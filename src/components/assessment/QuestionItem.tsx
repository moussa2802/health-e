import React from 'react';
import type { ScaleItem } from '../../types/assessment';
import { getExperience } from '../../data/experiences';
import SegmentedInput from './inputs/SegmentedInput';
import FrequencyStripInput from './inputs/FrequencyStripInput';
import AgreementScaleInput from './inputs/AgreementScaleInput';
import BinaryInput from './inputs/BinaryInput';
import ForcedChoiceInput from './inputs/ForcedChoiceInput';

interface QuestionItemProps {
  item: ScaleItem;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accentColor?: string;
  scaleId?: string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  item,
  value,
  onChange,
  disabled = false,
  accentColor = '#4A5D57',
  scaleId,
}) => {
  const experience = getExperience(scaleId ?? '');
  const resolvedInput = experience.inputByItemType?.[item.type] ?? experience.input;
  const useStrip = resolvedInput === 'frequency-strip' && item.type === 'frequency' && !item.noScore;
  const useAgreement = resolvedInput === 'agreement-scale';
  const useBinary = resolvedInput === 'binary';
  const useForcedChoice = resolvedInput === 'forced-choice';

  return (
    <div style={{ width: '100%' }}>
      <p className="font-display" style={{
        fontSize: 20,
        fontWeight: 600,
        color: '#17181B',
        lineHeight: 1.55,
        marginBottom: experience.answerPrompt ? 10 : 24,
        letterSpacing: '-0.01em',
      }}>
        {item.text}
      </p>

      {experience.answerPrompt && (
        <p style={{
          margin: '14px 0 14px',
          fontSize: 12.5,
          fontWeight: 700,
          color: '#4A5D57',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          {experience.answerPrompt}
          <span style={{ flex: 1, height: 1, background: '#E7E4DA' }} />
        </p>
      )}

      {useForcedChoice ? (
        <ForcedChoiceInput
          key={item.id}
          options={item.options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          accentColor={accentColor}
        />
      ) : useBinary ? (
        <BinaryInput
          key={item.id}
          options={item.options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          accentColor={accentColor}
          tone={experience.tone}
        />
      ) : useAgreement ? (
        <AgreementScaleInput
          key={item.id}
          options={item.options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          accentColor={accentColor}
        />
      ) : useStrip ? (
        <FrequencyStripInput
          key={item.id}
          options={item.options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          accentColor={accentColor}
        />
      ) : (
        <SegmentedInput
          item={item}
          value={value}
          onChange={onChange}
          disabled={disabled}
          accentColor={accentColor}
          scaleId={scaleId}
        />
      )}
    </div>
  );
};

export default QuestionItem;
