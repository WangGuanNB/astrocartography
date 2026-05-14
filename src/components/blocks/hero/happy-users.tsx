import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface HappyUsersProps {
  rating?: number;
  count?: string;
  label?: string;
  avatars?: string[];
}

export default function HappyUsers({ 
  rating = 5, 
  count = "99+", 
  label = "happy users",
  avatars = [1, 2, 3, 4, 5].map(num => `/imgs/users/${num}.png`)
}: HappyUsersProps) {
  return (
    <div className="mx-auto mt-8 flex w-fit flex-col items-center gap-2 sm:flex-row">
      <span className="mx-4 inline-flex items-center -space-x-2">
        {avatars.map((src, index) => (
          <Avatar className="size-12 border" key={index}>
            <AvatarImage
              src={src}
              alt={`Happy user ${index + 1}`}
            />
          </Avatar>
        ))}
      </span>
      <div className="flex flex-col items-center gap-1 md:items-start">
        <div className="flex items-center gap-1">
          {Array.from({ length: rating }).map((_, index) => (
            <Star
              key={index}
              className="size-5 fill-yellow-400 text-yellow-400"
            />
          ))}
        </div>
        <p className="text-left font-medium text-muted-foreground">
          from {count} {label}
        </p>
      </div>
    </div>
  );
}
