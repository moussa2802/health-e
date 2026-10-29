/**
 * Btn — les 3 niveaux de bouton de la charte (+ la variante « danger »).
 *  primary   : plein, couleur d'action. UN SEUL par écran.
 *  secondary : contour.
 *  tertiary  : lien souligné.
 *  danger    : contour rouge (supprimer, quitter) — jamais un petit lien rouge.
 * Passer `to` pour un lien interne, `href` pour un lien externe, sinon c'est un <button>.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { COLOR, FS, RADIUS, TAP } from '../../design/charte';
import { usePalette } from '../accueil/DrLoShell';

export type BtnVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

type Common = {
  variant?: BtnVariant;
  icon?: React.ReactNode;
  full?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  'aria-label'?: string;
};
type AsButton = Common & { to?: undefined; href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'children'>;
type AsLink = Common & { to: string; state?: unknown; href?: undefined; onClick?: () => void };
type AsHref = Common & { href: string; to?: undefined; onClick?: () => void };

/** `action` : le dégradé ambre du moment de la journée (palette.primary), à défaut COLOR.action. */
export function btnStyle(variant: BtnVariant = 'primary', full = false, action: string = COLOR.action): React.CSSProperties {
  const base: React.CSSProperties = {
    display: full ? 'flex' : 'inline-flex', width: full ? '100%' : undefined, alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', textAlign: 'center',
  };
  switch (variant) {
    case 'primary':
      return { ...base, minHeight: TAP.primary, padding: '0 22px', borderRadius: 14, border: 0, background: action, color: COLOR.onAction, fontSize: FS.body + 1 };
    case 'secondary':
      return { ...base, minHeight: TAP.secondary, padding: '0 18px', borderRadius: 14, border: `1px solid ${COLOR.lineStrong}`, background: 'transparent', color: COLOR.text, fontSize: FS.body };
    case 'danger':
      return { ...base, minHeight: TAP.secondary, padding: '0 18px', borderRadius: 14, border: `1px solid ${COLOR.attention}80`, background: 'transparent', color: COLOR.attention, fontSize: FS.body };
    case 'tertiary':
      return { ...base, minHeight: TAP.min, padding: '0 6px', borderRadius: RADIUS.sm, border: 0, background: 'none', color: COLOR.action, fontSize: FS.body, textDecoration: 'underline', textUnderlineOffset: 4 };
  }
}

const Btn: React.FC<AsButton | AsLink | AsHref> = (props) => {
  const { variant = 'primary', icon, full, children, style } = props;
  const palette = usePalette();
  const s = { ...btnStyle(variant, full, palette.primary), ...style };
  const inner = <>{icon}{children}</>;
  if ('to' in props && props.to !== undefined) {
    return <Link to={props.to} state={props.state} onClick={props.onClick} className="drl-btn" style={s} aria-label={props['aria-label']}>{inner}</Link>;
  }
  if ('href' in props && props.href !== undefined) {
    return <a href={props.href} onClick={props.onClick} className="drl-btn" style={s} aria-label={props['aria-label']} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  const { variant: _v, icon: _i, full: _f, children: _c, style: _s, ...rest } = props as AsButton;
  return <button type="button" {...rest} className="drl-btn" style={s}>{inner}</button>;
};

export default Btn;
