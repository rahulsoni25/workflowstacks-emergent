export default function WsMark({ className = 'w-5 h-5', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 120" fill="currentColor" aria-hidden="true">
      <polygon points="28,84 60,99 60,106 28,91" fillOpacity="0.30"/>
      <polygon points="92,84 60,99 60,106 92,91" fillOpacity="0.42"/>
      <polygon points="60,69 92,84 60,99 28,84" fillOpacity="0.55"/>
      <polygon points="28,58 60,73 60,80 28,65" fillOpacity="0.40"/>
      <polygon points="92,58 60,73 60,80 92,65" fillOpacity="0.55"/>
      <polygon points="60,43 92,58 60,73 28,58" fillOpacity="0.78"/>
      <polygon points="28,32 60,47 60,54 28,39" fillOpacity="0.55"/>
      <polygon points="92,32 60,47 60,54 92,39" fillOpacity="0.72"/>
      <polygon points="60,17 92,32 60,47 28,32"/>
    </svg>
  )
}
