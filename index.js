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
        var MessageTemplate = v8.internal.MessageTemplate;

        function make_unsigned(a) {
            return a >>> 0;
        }

        function IsInRange(value, lower_limit, higher_limit) {
            return make_unsigned(make_unsigned(value) - make_unsigned(lower_limit))
                 <= make_unsigned(make_unsigned(higher_limit) - make_unsigned(lower_limit));
        }

        function AsciiAlphaToLower(c) {
            return c | 0x20;
        }

        function IsDecimalDigit(c) {
            return IsInRange(c, '0'.charCodeAt(),'9'.charCodeAt());
        }

        function IsAlphaNumeric(c) {
            return IsInRange(AsciiAlphaToLower(c),'a'.charCodeAt(),'z'.charCodeAt()) || IsDecimalDigit(c);
        }

        function IsAsciiIdentifier(c) {
            return IsAlphaNumeric(c) || c == '$' || c == '_';
        }

        

        var one_char_tokens = v8.internal.one_char_tokens = new Array(128);

        function GetOneCharToken(c) {
            return c == '('.charCodeAt() ? Token.LPAREN :
                c == ')'.charCodeAt() ? Token.RPAREN :
                c == '{'.charCodeAt() ? Token.LBRACE :
                c == '}'.charCodeAt() ? Token.RBRACE :
                c == '['.charCodeAt() ? Token.LBRACK :
                c == ']'.charCodeAt() ? Token.RBRACK :
                c == '?'.charCodeAt() ? Token.CONDITIONAL :
                c == ':'.charCodeAt() ? Token.COLON :
                c == ';'.charCodeAt() ? Token.SEMICOLON :
                c == ','.charCodeAt() ? Token.COMMA :
                c == '.'.charCodeAt() ? Token.PERIOD :
                c == '|'.charCodeAt() ? Token.BIT_OR :
                c == '&'.charCodeAt() ? Token.BIT_AND :
                c == '^'.charCodeAt() ? Token.BIT_XOR :
                c == '~'.charCodeAt() ? Token.BIT_NOT :
                c == '!'.charCodeAt() ? Token.NOT :
                c == '<'.charCodeAt() ? Token.LT :
                c == '>'.charCodeAt() ? Token.GT :
                c == '%'.charCodeAt() ? Token.MOD :
                c == '='.charCodeAt() ? Token.ASSIGN :
                c == '+'.charCodeAt() ? Token.ADD :
                c == '-'.charCodeAt() ? Token.SUB :
                c == '*'.charCodeAt() ? Token.MUL :
                c == '/'.charCodeAt() ? Token.DIV :
                c == '#'.charCodeAt() ? Token.PRIVATE_NAME :
                c == '"'.charCodeAt() ? Token.STRING :
                c == '\''.charCodeAt() ? Token.STRING :
                c == '`'.charCodeAt() ? Token.TEMPLATE_SPAN :
                c == '\\'.charCodeAt() ? Token.IDENTIFIER :
                
                c == ' '.charCodeAt() ? Token.WHITESPACE :
                c == '\t'.charCodeAt() ? Token.WHITESPACE :
                c == '\v'.charCodeAt() ? Token.WHITESPACE :
                c == '\f'.charCodeAt() ? Token.WHITESPACE :
                c == '\r'.charCodeAt() ? Token.WHITESPACE :
                c == '\n'.charCodeAt() ? Token.WHITESPACE :
                
                IsDecimalDigit(c) ? Token.NUMBER :
                IsAsciiIdentifier(c) ? Token.IDENTIFIER :
                Token.ILLEGAL;
        }

        function CALL_GET_SCAN_FLAGS(N) {
            one_char_tokens[N] = GetOneCharToken(N);
        }

        function INT_0_TO_127_LIST(V) {
            V(0),V(1),V(2),V(3),V(4),V(5),V(6),V(7),V(8),V(9),
            V(10),V(11),V(12),V(13),V(14),V(15),V(16),V(17),V(18),V(19),
            V(20),V(21),V(22),V(23),V(24),V(25),V(26),V(27),V(28),V(29),
            V(30),V(31),V(32),V(33),V(34),V(35),V(36),V(37),V(38),V(39),
            V(40),V(41),V(42),V(43),V(44),V(45),V(46),V(47),V(48),V(49),
            V(50),V(51),V(52),V(53),V(54),V(55),V(56),V(57),V(58),V(59),
            V(60),V(61),V(62),V(63),V(64),V(65),V(66),V(67),V(68),V(69),
            V(70),V(71),V(72),V(73),V(74),V(75),V(76),V(77),V(78),V(79),
            V(80),V(81),V(82),V(83),V(84),V(85),V(86),V(87),V(88),V(89),
            V(90),V(1),V(92),V(93),V(94),V(95),V(96),V(97),V(98),V(99),
            V(100),V(101),V(102),V(103),V(104),V(105),V(106),V(107),V(108),V(109);
            V(120),V(121),V(122),V(123),V(124),V(125),V(126),V(127);
        }

        INT_0_TO_127_LIST(CALL_GET_SCAN_FLAGS);

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

        var kCharacterLookaheadBufferSize = Scanner.kCharacterLookaheadBufferSize = 1;
        var kMaxAscii = Scanner.kMaxAscii = 127;

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
            this.current_ = this.token_storage[0];
            this.next_ = this.token_storage[1];
            this.next_next_ = this.token_storage[3];
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
                this.Scan(this.next_);
                return;
            }

            next_desc.token = this.ScanSingleToken();
            next_desc.location.end_pos = this.source_pos();
        };

        Scanner.prototype.Next = function() {
            // Rotate through tokens.
            var previous = this.current_;
            this.current_ = this.next_;

            if (this.next_next().token == Token.UNINITIALIZED) {
                this.next_ = previous;
                // User 'previous' instead of 'next_' because for some reason the compiler
                // thinks 'next_' could be modified before the entry into Scan.
                previous.after_line_terminator = false;
                this.Scan(previous);
            } else {
                this.next_ = this.next_next_;
                this.next_next_ = previous;
                previous.token = Token.UNINITIALIZED;
            }
            return current().token;
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
        Scanner.prototype.next_next = function() {
            return this.next_next_;
        };

        Scanner.prototype.ScanSingleToken = function() {
            var token;

            do {
                this.next().location.beg_pos = this.source_pos();

                if(this.c0_ <= kMaxAscii) {
                    token = one_char_tokens[this.c0_];

                    switch(token) {
                        case Token.LPAREN:
                        case Token.RPAREN:
                        case Token.LBRACE:
                        case Token.RBRACE:
                        case Token.LBRACK:
                        case Token.RBRACK:
                        case Token.COLON:
                        case Token.SEMICOLON:
                        case Token.COMMA:
                        case Token.BIT_NOT:
                        case Token.ILLEGAL:
                            return this.Select(token);
                        case Token.CONDITIONAL:
                            // ? ?. ??
                            this.Advance();
                            if (this.allow_harmony_optional_chaining() && this.c0_ == '.'.charCodeAt()) {
                                this.Advance();
                                if (!IsDecimalDigit(c0_)) return Token.QUESTION_PERIOD;
                                this.PushBack('.'.charCodeAt());
                            } else if (this.allow_harmony_nullish() && this.c0_ == '?'.charCodeAt()) {
                                return this.Select(Token.NULLISH);
                            }
                            return Token.CONDITIONAL;
                            
                        case Token.STRING:
                            return ScanString();
                    }
                }

            } while(token == Token.WHITESPACE);
        }

        Scanner.prototype.source_pos = function() {
            return this.source_.pos() - kCharacterLookaheadBufferSize;
        }

        Scanner.prototype.Select = function(tokOrNext, then, else_) {
            if(arguments.length == 1) {
                this.Advance();
                return tokOrNext;
            }
        }

        Scanner.prototype.allow_harmony_optional_chaining = function() {
            return this.allow_harmony_optional_chaining_;
        }

        Scanner.prototype.PushBack = function(ch) {
            this.source_.Back();
            this.c0_ = ch;
        }

        v8.internal.Scanner = Scanner;
    })();

})(this);
