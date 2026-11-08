export default function Card({ as: Element = 'div', className = '', children, ...props }) {
  return (
    <Element className={`card-surface ${className}`.trim()} {...props}>
      {children}
    </Element>
  );
}
