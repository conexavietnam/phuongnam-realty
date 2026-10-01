import { Phone, MessageCircle } from 'lucide-react';
import type { Agent } from '@/types';
import { Button } from '@/components/common/Button';

export interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 flex flex-col items-center text-center">
      {/* Avatar Circle */}
      <div className="relative w-24 h-24 mb-4">
        <img
          src={agent.avatar}
          alt={agent.name}
          className="w-full h-full rounded-full object-cover border-2 border-gold-500 shadow-md"
        />
        <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
      </div>

      {/* Info */}
      <h3 className="font-semibold text-lg text-navy-900 mb-0.5">{agent.name}</h3>
      <p className="text-slate-500 text-sm mb-3">{agent.title}</p>

      {/* Phone Number */}
      <a
        href={`tel:${agent.phone.replace(/\s+/g, '')}`}
        className="inline-flex items-center gap-2 text-navy-900 font-bold text-base hover:text-gold-500 transition-colors mb-2"
      >
        <Phone className="w-4 h-4 text-gold-500" />
        <span>{agent.phone}</span>
      </a>

      {/* Zalo Link */}
      <a
        href={agent.zaloLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm mb-5 transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Chat Zalo</span>
      </a>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-2">
        <a href={`tel:${agent.phone.replace(/\s+/g, '')}`} className="w-full">
          <Button variant="primary" size="md" className="w-full font-semibold">
            Liên hệ ngay
          </Button>
        </a>
        <a href={agent.zaloLink} target="_blank" rel="noopener noreferrer" className="w-full">
          <Button variant="outline" size="md" className="w-full font-semibold">
            Nhắn tin
          </Button>
        </a>
      </div>
    </div>
  );
}
