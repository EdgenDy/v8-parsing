(function(global) {
    "use strict";
    // javascript implementation of namespaces
    function namespace_(names) {
        var space = Object.create(null);
        for(var name in names)
            space[name] = names[name];
        return space;
    }

    function Min(a,b) {
        return Math.min(a,b);
    }

    // v8 namespace 
    global.v8 = namespace_({
        // internal namespace
        internal : namespace_({
            Utf16CharacterStream : null,
            BufferedCharacterStream : null,
            Token : null,
            Scanner : null,
            Parser : null
        })
    });

    // using i = v8::internal from common/globals.h
    var i = v8.internal;

    // implementation of i::CopyCharsUnsigned in util/utils.h
    (function() {
        // implementation was completely different from the original c++ code
        // instead of memory copy which is not supported in javascript
        // this implementation copies only the values from 
        // the source array to destination array
        function CopyCharsUnsigned(dest,source,length) {
            var index = 0;

            while(index < length) {
                dest[index] = source[index].charCodeAt(0);
                index++;
            }
        }

        var MessageTemplate = {
            kNone : 0
        };

        v8.internal.CopyCharsUnsigned = CopyCharsUnsigned;
        v8.internal.MessageTemplate = MessageTemplate;
    })();

    (function() {
        function String(string) {
            var chars = (string ? string.split("") : []);
            this.GetChars = function() {
                return chars;
            }
        }
        v8.internal.String = String;
    })();

    (function() {
        // Javascript version of v8::internal::Utf16CharacterStream at scanner.h
        function Utf16CharacterStream(buffer_start, buffer_cursor, buffer_end, buffer_pos) {
            this.buffer_start_ = buffer_start;
            this.buffer_cursor_ = buffer_cursor;
            this.buffer_end_ = buffer_end;
            this.buffer_pos_ = buffer_pos;
            this.has_parser_error = false;
        }

        var kEndOfInput = Utf16CharacterStream.kEndOfInput = -1;
        Utf16CharacterStream.prototype.Peek = function() {
            // Checks if buffer_cursor is still less than buffer_end 
            // if isn't ReadBlockChecked will be invoked to load new characters in buffer
            if(this.buffer_cursor_ < this.buffer_end_)
                return this.buffer_[this.buffer_cursor_];
            else if(this.ReadBlockChecked())
                return this.buffer_[this.buffer_cursor_];
            else
                return kEndOfInput;
        };
        // returns the current character on buffer indexed by buffer_cursor_
        Utf16CharacterStream.prototype.Advance = function() {
            var result = this.Peek();
            this.buffer_cursor_++;
            return result;
        }
        Utf16CharacterStream.prototype.AdvanceUntil = function(check) {
            while(true) {
                var next_cursor_pos = this.buffer_end_;
                while(this.buffer_cursor_ < this.buffer_end_) {
                    if(check(this.buffer_[this.buffer_cursor_])) {
                        next_cursor_pos = this.buffer_cursor_;
                        break;
                    }
                    this.buffer_cursor_++;
                }

                if(next_cursor_pos == this.buffer_end_) {
                    this.buffer_cursor_ = this.buffer_end_;
                    if(!this.ReadBlockChecked()) {
                        this.buffer_cursor_++;
                        return kEndOfInput;
                    }
                }
                else {
                    this.buffer_cursor_ = next_cursor_pos + 1;
                    return this.buffer_[next_cursor_pos];
                }

            }
        }
        Utf16CharacterStream.prototype.Back = function() {
            if(this.buffer_cursor_ > this.buffer_start_)
                this.buffer_cursor_--;
            else
                this.ReadBlockAt(this.pos() - 1);
        };
        // Returns the current position on our character stream
        Utf16CharacterStream.prototype.pos = function() {
            return this.buffer_pos_ + (this.buffer_cursor_ - this.buffer_start_);
        };
        Utf16CharacterStream.prototype.Seek = function(pos) {
            if(pos > this.buffer_pos_ && 
               pos < (this.buffer_pos_ + (this.buffer_end_ - this.buffer_start_)))
                this.buffer_cursor_ + (pos - this.buffer_pos_);
            else
                this.ReadBlockAt(pos);
        };

        Utf16CharacterStream.prototype.ReadBlockChecked = function() {
            return !this.has_parser_error && this.ReadBlock();
        };
        Utf16CharacterStream.prototype.ReadBlockAt = function(new_pos) {
            this.buffer_pos_ = new_pos;
            this.buffer_cursor_ = this.buffer_start_;
            this.ReadBlockChecked();
        };

        v8.internal.Utf16CharacterStream = Utf16CharacterStream;
    })();

    (function() {
        function Range() {
            this.start = 0;
            this.end = 0;
            this._chars;
        }
        Range.prototype = {
            constructor : Range,
            length : function() {
                return this.end - this.start;
            }
        };
        v8.internal.Range = Range;

        function OnHeapStream(string,start_offset,end) {
            this.string_ = string;
            this.start_offset_ = start_offset;
            this.length_ = end;
        }
        OnHeapStream.prototype = {
            constructor : OnHeapStream,
            GetDataAt : function(pos) {
                var range = new Range();
                range.start = this.start_offset_ + Min(this.length_,pos);
                range.end = this.start_offset_ + this.length_;
                range.start_ = this.string_.GetChars().slice(range.start);
                return range;
            }
        };
        v8.internal.OnHeapStream = OnHeapStream;

        function BufferedCharacterStream(ByteStream, pos, string, start_offset, end) {
            this.byte_stream_ = new ByteStream(string,start_offset,end);
            this.buffer_pos_ = pos;
            this.buffer_ = new Array(BufferedCharacterStream.kBufferSize);
            this.buffer_start_ = 0;
            this.buffer_cursor_ = 0;
            this.buffer_end_ = 0;
        }
        var kBufferSize = BufferedCharacterStream.kBufferSize = 512;
        BufferedCharacterStream.prototype = Object.create(v8.internal.Utf16CharacterStream.prototype);
        BufferedCharacterStream.prototype.constructor = BufferedCharacterStream;
        BufferedCharacterStream.prototype.ReadBlock = function() {
            var position = this.pos();
            this.buffer_pos_ = position;
            this.buffer_start_ = 0;
            this.buffer_cursor_ = 0;

            var range = this.byte_stream_.GetDataAt(position);
            if(range.length() == 0) {
                this.buffer_end_ = this.buffer_start;
                return false;
            }

            var length = Min(kBufferSize, range.length());
            i.CopyCharsUnsigned(this.buffer_, range.start_,length);
            this.buffer_end_ = length;
            return true;
        }
        

        v8.internal.BufferedCharacterStream = BufferedCharacterStream;
    })();

    (function() {
        function IGNORE_TOKEN(name, string, precedence) {}

        
        function BINARY_OP_TOKEN_LIST(T, E) {
            E(T, "BIT_OR", "|", 6);
            E(T, "BIT_XOR", "^", 7);
            E(T, "BIT_AND", "&", 8);
            E(T, "SHL", "<<", 11);
            E(T, "SAR", ">>", 11);
            E(T, "SHR", ">>>", 11);
            E(T, "MUL", "*", 13);
            E(T, "DIV", "/", 13);
            E(T, "MOD", "%", 13);
            E(T, "EXP", "**", 14);
            E(T, "ADD", "+", 12);
            E(T, "SUB", "-", 12);
        }

        function EXPAND_BINOP_ASSIGN_TOKEN(T, name, string, precedence) {
            T("ASSIGN_"+name, string, "=", 2);
        }

        function EXPAND_BINOP_TOKEN(T, name, string, precedence) {
            T(name, string, precedence)
        }

        function TOKEN_LIST(T,K) {
            T("TEMPLATE_SPAN", null, 0);
            T("TEMPLATE_TAIL", null, 0);

            T("PERIOD", ".", 0);
            T("LBRACK", "[", 0);

            T("QUESTION_PERIOD", "?.", 0);
            T("LPAREN", "(", 0);

            T("RPAREN", ")", 0);
            T("RBRACK", "]", 0);
            T("LBRACE", "{", 0);
            T("COLON", ":", 0);
            T("ELLIPSIS", "...", 0);
            T("CONDITIONAL", "?", 3);

            T("SEMICOLON", ";", 0);
            T("RBRACE", "}", 0);

            T("EOS", "EOS", 0);



            T("ARROW", "=>", 0);

            T("INIT", "=init", 2);
            T("ASSIGN", "=", 2);

            BINARY_OP_TOKEN_LIST(T, EXPAND_BINOP_ASSIGN_TOKEN);

            T("COMMA", ",", 1);
            T("NULLISH", "??", 3);
            T("OR", "||", 4);
            T("AND", "&&", 5);

            BINARY_OP_TOKEN_LIST(T, EXPAND_BINOP_TOKEN);

            T("NOT", "!", 0);
            T("BIT_NOT", "~", 0);
            K("DELETE", "delete", 0);
            K("TYPEOF", "typeof", 0);
            K("VOID", "void", 0);

            T("INC", "++", 0);
            T("DEC", "--", 0);

            T("EQ", "==", 9);
            T("EQ_STRICT", "===", 9);
            T("NE", "!=", 9);
            T("NE_STRICT", "!==", 9);
            T("LT", "<", 10);
            T("GT", ">", 10);
            T("LTE", "<=", 10);
            T("GTE", ">=", 10);
            K("INSTANCEOF", "instanceof", 10);
            K("IN", "in", 10);

            K("BREAK", "break", 0);
            K("CASE", "case", 0);
            K("CATCH", "catch", 0);
            K("CONTINUE", "continue", 0);
            K("DEBUGGER", "debugger", 0);
            K("DEFAULT", "default", 0);
            
            K("DO", "do", 0);
            K("ELSE", "else", 0);
            K("FINALLY", "finally", 0);
            K("FOR", "for", 0);
            K("FUNCTION", "function", 0);
            K("IF", "if", 0);

            K("NEW", "new", 0);
            K("RETURN", "return", 0);
            K("SWITCH", "switch", 0);
            K("THROW", "throw", 0);
            K("TRY", "try", 0);

            K("VAR", "var", 0);
            
            K("WHILE", "while", 0);
            K("WITH", "with", 0);
            K("THIS", "this", 0);

            K("NULL_LITERAL", "null", 0);
            K("TRUE_LITERAL", "true", 0);
            K("FALSE_LITERAL", "false", 0);
            T("NUMBER", null, 0);
            T("SMI", null, 0);
            T("BIGINT", null, 0);
            T("STRING", null, 0);

            K("SUPER", "super", 0);

            T("IDENTIFIER", null, 0);
            K("GET", "get", 0);
            K("SET", "set", 0);
            K("ASYNC", "async", 0);
            
            K("AWAIT", "await", 0);
            K("YIELD", "yield", 0);
            K("LET", "let", 0);
            K("STATIC", "static", 0);

            T("FUTURE_STRICT_RESERVED_WORD", null, 0);
            T("ESCAPED_STRICT_RESERVED_WORD", null, 0);
            
            K("ENUM", "enum", 0);
            K("CLASS", "class", 0);
            K("CONST", "const", 0);
            K("EXPORT", "export", 0);
            K("EXTENDS", "extends", 0);
            K("IMPORT", "import", 0);
            T("PRIVATE_NAME", null, 0);

            T("ILLEGAL", "ILLEGAL", 0);
            T("ESCAPED_KEYWORD", null, 0);
                                                                           
            T("WHITESPACE", null, 0);
            T("UNINITIALIZED", null, 0);
            T("REGEXP_LITERAL", null, 0);
        }

        function Token() {
            
        }

        var token_value = 0;

        function T(name, string, precedence) {
            Token[name] = token_value++;
        }

        TOKEN_LIST(T,T);

        v8.internal.Token = Token;
    })();

    (function() {
        var Token = v8.internal.Token;

        function IsInRange(val, min, max) {
            return val >= min && val <= max;
        }

        function TokenDesc() {
            this.location = new Location(0,0);
            this.literal_chars = undefined;
            this.raw_literal_chars = undefined;
            this.token = Token.UNINITIALIZED;
            this.invalid_template_escape_message = undefined;
            this.invalid_template_escape_location = undefined;
            this.smi_value = 0;
            this.after_line_terminator = false;

            this.CanAccessLiteral = function() {
                return token == Token.PRIVATE_NAME || token == Token.ILLEGAL ||
                    token == Token.UNINITIALIZED || token == Token.REGEXP_LITERAL ||
                    IsInRange(token, Token.NUMBER, Token.STRING) ||
                    Token.IsAnyIdentifier(token) || Token.IsKeyword(token) ||
                    IsInRange(token, Token.TEMPLATE_SPAN, Token.TEMPLATE_TAIL);
            };

            this.CanAccessRawLiteral = function() {
                return token == Token.ILLEGAL || token == Token.UNINITIALIZED ||
                    IsInRange(token, Token.TEMPLATE_SPAN, Token.TEMPLATE_TAIL);
            }
        }

        function Scanner(source, is_module) {
            this.source_ = source;
            this.is_module_ = is_module;
            this.c0_ = -1;
            this.token_storage = [new TokenDesc(),new TokenDesc(),new TokenDesc()];
            this.found_html_comment = false;

            this.current_ = undefined;
            this.next_ = undefined;
            this.next_next_ = undefined;

            this.allow_harmony_optional_chaining_ = false;
            this.allow_harmony_nullish_ = false;

            this.octal_pos_ = Location.invalid();
            this.octal_message_ = MessageTemplate.kNone;
        }

        function Location(b, e) {
            this.beg_pos = b;
            this.end_pos = e;
        }

        Location.prototype.length = function() {
            return this.end_pos - this.beg_pos;
        }

        Location.invalid = function() {
            return new Location(-1, 0);
        }

        Scanner.prototype.Init = function() {
            this.Advance();
            this.current_ = token_storage[0];
            this.next_ = token_storage[1];
            this.next_next_ = token_storage[3];
            this.found_html_comment = false;
            this.scanner_error = MessageTemplate.kNone;
        }

        Scanner.prototype.Advance = function() {
            this.c0_ = this.source_.Advance();
        }

        Scanner.prototype.Peek = function() {

        }

        Scanner.prototype.Initialize = function() {
            this.Init();
            this.next().after_line_terminator = true;
            this.Scan();
        };
        Scanner.prototype.Scan = function(next_desc) {
            if(arguments.length==0) {
                Scan(this.next_);
            }
            else {
                
            }
        };

        Scanner.prototype.Next = function() {

        }

        Scanner.prototype.PeekAhead = function() {

        }

        Scanner.prototype.current_token = function() {

        }

        Scanner.prototype.peek = function() {

        }

        Scanner.prototype.current = function() {
            return this.current_;
        };
        Scanner.prototype.next = function() {
            return this.next_;
        };
        Scanner.prototype.next_next() {
            return this.next_next_;
        };

        v8.internal.Scanner = Scanner;
    })();

})(this);
