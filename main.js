(function(global) {
   function namespace(names) {
      var space = Object.create(null);
      for (var name in names)
         space[name] = names[name];
      return space;
   }
   global.v8 = namespace({
      internal: namespace({
         Utf16CharacterStream: null,
         BufferedCharacterStream: null,
         Token: null,
         Scanner: null,
         Parser: null
      })
   });

   (function() {
      function Utf16CharacterStream(source) {
         this.source = source;
         this.end = source?source.length : 0;
      }
      
      Utf16CharacterStream.prototype = {
         constructor : Utf16CharacterStream, 
         endOfInput : -1,
         cursor : 0,
         end : 0,
         source : null, 
         Peek : function Peek() {
            if(this.cursor < end)
               return this.source.codePointAt(this.cursor);
            else
               return this.endOfInput;
         }, 
         Advance : function Advance() {
            var result = this.Peek();
            this.cursor++;
            return result;
         }, 
         AdvanceUntil : function(check) {
            
         }, 
         Back : function() {
            if(this.cursor > 0)
               this.cursor--;
         }
      }
      v8.internal.Utf16CharacterStream =
         Utf16CharacterStream;
   })();
})(this);
