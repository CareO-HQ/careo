const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('page.tsx')) files.push(name);
    }
  }
  return files;
}

const files = getFiles('app/(dashboard)/dashboard/residents/[id]/(pages)');

let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let replaced = false;

  // We need to inject Avatar into imports if not already present, if replacing icon with Avatar form
  // However, most of these pages SHOULD have Avatar from @/components/ui/avatar imported if they were already using it.
  // Actually, some pages didn't use Avatar before, so they might need the import.
  const importAvatarCheck = /import \{.*?Avatar,.*?\} from "@\/components\/ui\/avatar"/;
  if (!importAvatarCheck.test(content) && content.includes('<Avatar')) {
      const firstImport = content.match(/import [^\n]+/);
      if (firstImport && !content.includes('from "@/components/ui/avatar"')) {
          content = content.replace(firstImport[0], `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";\n${firstImport[0]}`);
      }
  }

  // Regex 1: Avatar with h1
  const regex = /<Avatar className="[^"]+">\s*<AvatarImage src=\{resident\?\.image_url(?:\s*\|\|\s*resident\?\.imageUrl)?(?:\s*\|\|\s*""\}|\}) alt=\{fullName\} className="border" \/>\s*<AvatarFallback className="[^"]+">\s*\{initials\}\s*<\/AvatarFallback>\s*<\/Avatar>\s*<div className="flex-1">\s*<h1 className="[^"]+">(.*?)<\/h1>/gs;
  content = content.replace(regex, (match, p1) => {
      replaced = true;
      return `<Avatar className="w-16 h-16">
          <AvatarImage src={resident?.image_url || resident?.imageUrl || ""} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl">{fullName}</span>
            <span className="text-muted-foreground">/ ${p1}</span>
          </div>`;
  });

  if (!replaced) {
      const regex2 = /<Avatar className="w-10 h-10">[\s\S]*?<AvatarFallback[^>]+>\s*\{initials\}\s*<\/AvatarFallback>[\s\S]*?<\/Avatar>[\s\S]*?<div className="flex-1">[\s\S]*?<h1[^>]+>(.*?)<\/h1>/gs;
      content = content.replace(regex2, (match, p1) => {
          replaced = true;
          return `<Avatar className="w-16 h-16">
            <AvatarImage src={resident?.image_url || resident?.imageUrl || ""} alt={fullName} className="border" />
            <AvatarFallback className="text-base bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-xl">{fullName}</span>
              <span className="text-muted-foreground">/ ${p1}</span>
            </div>`;
      });
  }

  if (!replaced) {
      const regexIcon = /<div className="flex items-center space-x-3">\s*<div className="p-2 bg-[^"]+">\s*<[A-Z][A-Za-z]+ className="w-6 h-6 text-[^"]+" \/>\s*<\/div>\s*<div>\s*<h1 className="text-xl sm:text-2xl font-bold">(.*?)<\/h1>/gs;
      content = content.replace(regexIcon, (match, p1) => {
          replaced = true;
          // Ensure Avatar is imported since replacing icon
          if (!content.includes('import { Avatar')) {
              content = `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";\n${content}`;
          }
          // We need initials logic to be present. Almost all tabs define initials as: `const initials = ...`
          // Let's assume initials is valid, or we fix missing if undefined.
          return `<Avatar className="w-16 h-16">
          <AvatarImage src={resident?.image_url || ""} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl">{fullName}</span>
            <span className="text-muted-foreground">/ ${p1}</span>
          </div>`;
      });
  }
  
  if (replaced) {
      // In some files, fullName and initials are missing if we replaced the Icon layout.
      // Let's inject them if they don't exist
      if (!content.includes('const fullName =')) {
          const exportDefaultRegex = /export default function [^)]+\)\s*\{/;
          content = content.replace(exportDefaultRegex, match => `${match}\n  const fullName = \`\${resident?.first_name || ""} \${resident?.last_name || ""}\`.trim();\n  const initials = (resident?.first_name?.[0] || "") + (resident?.last_name?.[0] || "");\n`);
      }
      fs.writeFileSync(file, content);
      changed++;
      console.log('Updated', file);
  } else {
      console.log('No match found in:', file);
  }
});
console.log('Total files changed:', changed);
